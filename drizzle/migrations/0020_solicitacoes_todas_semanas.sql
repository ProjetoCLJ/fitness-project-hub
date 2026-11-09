-- 0019 · Solicitação para mudar um treino em TODAS as semanas (horário e/ou dia da semana), daqui para frente.
--  * workout_requests.scope: 'single' (só aquela data, como antes) ou 'all' (todas as repetições daquele treino do ciclo).
--  * workout_requests.conflict_dates: nas próximas repetições, as datas em que o novo horário está ocupado (aviso; não bloqueia).
--  * Aceitar 'all' atualiza o próprio treino no plano (dia da semana e horário). Treinos já feitos/ocorridos ficam como estão;
--    só os pendentes daqui para frente são refeitos. Vale a última solicitação: mudanças pontuais futuras deste treino são descartadas.
--  * Só planos com ciclo (treino que se repete) aceitam 'all'; só aquele treino do plano muda (não os demais).

ALTER TABLE public.workout_requests ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'single';
ALTER TABLE public.workout_requests ADD COLUMN IF NOT EXISTS conflict_dates date[] NOT NULL DEFAULT '{}';
ALTER TABLE public.workout_requests DROP CONSTRAINT IF EXISTS workout_requests_scope_check;
ALTER TABLE public.workout_requests ADD CONSTRAINT workout_requests_scope_check CHECK (scope IN ('single', 'all'));
ALTER TABLE public.workout_requests DROP CONSTRAINT IF EXISTS workout_requests_scope_kind_check;
ALTER TABLE public.workout_requests ADD CONSTRAINT workout_requests_scope_kind_check CHECK (scope = 'single' OR kind = 'reschedule');

-- ---------- Agenda livre/ocupado: sem data de exclusão, ignora TODAS as ocorrências daquele treino ----------
CREATE OR REPLACE FUNCTION public.trainer_agenda_availability(
  p_trainer uuid, p_from date, p_to date,
  p_exclude_workout uuid DEFAULT NULL, p_exclude_date date DEFAULT NULL, p_exclude_request uuid DEFAULT NULL)
RETURNS TABLE (day date, slot_start time, slot_end time, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := public.today_brt(); _now_h integer := extract(hour FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::integer;
BEGIN
  IF NOT COALESCE(public.can_see_trainer_agenda(p_trainer), false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF p_to < p_from OR p_to - p_from > 31 THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;

  PERFORM public.materialize_slots(st.student_id, GREATEST(p_from, _today), GREATEST(p_to, _today))
    FROM (SELECT DISTINCT pl.student_id FROM public.plans pl WHERE pl.trainer_id = p_trainer AND pl.status = 'active') st;

  RETURN QUERY
  WITH days AS (SELECT g::date AS d FROM generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') g),
       hours AS (SELECT make_time(h, 0, 0) AS s, make_time(h + 1, 0, 0) AS e, h FROM generate_series(6, 21) h),
       grid AS (SELECT days.d, hours.s, hours.e, hours.h FROM days CROSS JOIN hours),
       ev AS (
         SELECT x.type::text AS type, x.start_time AS st, x.end_time AS en, dd.d
         FROM public.schedule_events x
         JOIN days dd ON ((x.recurrence::text = 'once' AND x.date = dd.d)
                       OR (x.recurrence::text = 'weekly' AND dd.d >= x.start_date AND (x.end_date IS NULL OR dd.d <= x.end_date)
                           AND extract(dow FROM dd.d)::int = ANY (COALESCE(x.weekdays, '{}'::int[]))))
                      AND NOT (dd.d = ANY (COALESCE(x.excluded_dates, '{}'::date[])))
         WHERE x.trainer_id = p_trainer
       )
  SELECT grid.d, grid.s, grid.e,
         (CASE
           WHEN grid.d < _today OR (grid.d = _today AND grid.h <= _now_h) THEN 'busy'
           WHEN NOT EXISTS (SELECT 1 FROM ev WHERE ev.d = grid.d AND ev.type = 'expediente' AND ev.st < grid.e AND ev.en > grid.s) THEN 'busy'
           WHEN EXISTS (SELECT 1 FROM ev WHERE ev.d = grid.d AND ev.type IN ('aula', 'bloqueado') AND ev.st < grid.e AND ev.en > grid.s) THEN 'busy'
           WHEN EXISTS (SELECT 1 FROM public.planned_slots s JOIN public.plans pl ON pl.id = s.plan_id
                         WHERE pl.trainer_id = p_trainer AND s.accompanied AND s.start_time IS NOT NULL AND s.status IN ('pending', 'done')
                           AND s.planned_date = grid.d AND s.start_time < grid.e AND (s.start_time + interval '60 minutes') > grid.s
                           AND NOT (s.workout_id IS NOT DISTINCT FROM p_exclude_workout AND (p_exclude_date IS NULL OR s.planned_date = p_exclude_date))) THEN 'busy'
           WHEN EXISTS (SELECT 1 FROM public.workout_requests r
                         WHERE r.trainer_id = p_trainer AND r.status = 'pending' AND r.kind = 'reschedule'
                           AND r.id IS DISTINCT FROM p_exclude_request
                           AND r.to_date = grid.d AND r.to_start < grid.e AND (r.to_start + interval '60 minutes') > grid.s) THEN 'busy'
           ELSE 'free'
         END)::text
  FROM grid
  ORDER BY grid.d, grid.s;
END $$;

-- ---------- Conflitos nas próximas repetições (aviso) ----------
CREATE OR REPLACE FUNCTION public.recurrence_conflict_dates(p_workout uuid, p_to date, p_start time) RETURNS date[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan public.plans%ROWTYPE; k integer; d date; _out date[] := '{}';
BEGIN
  SELECT p.* INTO _plan FROM public.workouts w JOIN public.plans p ON p.id = w.plan_id WHERE w.id = p_workout;
  IF NOT FOUND OR _plan.cycle_weeks IS NULL OR _plan.trainer_id IS NULL THEN RETURN _out; END IF;
  FOR k IN 1..7 LOOP
    d := p_to + 7 * _plan.cycle_weeks * k;
    EXIT WHEN _plan.deadline IS NOT NULL AND d > _plan.deadline;
    IF NOT public.slot_is_free(_plan.trainer_id, d, p_start, p_workout, NULL, NULL) THEN _out := _out || d; END IF;
  END LOOP;
  RETURN _out;
END $$;

CREATE OR REPLACE FUNCTION public.workout_recurrence_conflicts(p_workout uuid, p_to date, p_start time) RETURNS date[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan public.plans%ROWTYPE;
BEGIN
  SELECT p.* INTO _plan FROM public.workouts w JOIN public.plans p ON p.id = w.plan_id WHERE w.id = p_workout;
  IF NOT FOUND OR _plan.trainer_id IS NULL THEN RAISE EXCEPTION 'NO_TRAINER'; END IF;
  IF NOT COALESCE(_plan.student_id = public.current_student_id() OR _plan.trainer_id = public.current_trainer_id(), false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  RETURN public.recurrence_conflict_dates(p_workout, p_to, p_start);
END $$;

-- ---------- Aplicar a mudança em todas as semanas ----------
CREATE OR REPLACE FUNCTION public.apply_workout_recurring_change(p_workout uuid, p_from date, p_to date, p_start time) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan public.plans%ROWTYPE; _today date := public.today_brt(); _first date;
BEGIN
  SELECT p.* INTO _plan FROM public.workouts w JOIN public.plans p ON p.id = w.plan_id WHERE w.id = p_workout;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _plan.cycle_weeks IS NULL THEN RAISE EXCEPTION 'NOT_RECURRING'; END IF;
  IF public.monday_of(p_to) <> public.monday_of(p_from) THEN RAISE EXCEPTION 'WEEK_MISMATCH'; END IF;

  -- O treino passa a acontecer no novo dia da semana e horário (só este treino do plano).
  UPDATE public.workouts SET weekday = extract(dow FROM p_to)::int, start_time = p_start WHERE id = p_workout;

  -- Vale a última solicitação: descarta as mudanças pontuais e refaz os treinos pendentes daqui para frente.
  _first := GREATEST(public.monday_of(p_from), _today);
  DELETE FROM public.slot_exceptions WHERE workout_id = p_workout AND date >= _first;
  DELETE FROM public.planned_slots WHERE workout_id = p_workout AND status = 'pending' AND planned_date >= _today;
  PERFORM public.materialize_slots(_plan.student_id, _first, _today + 28);
END $$;

-- ---------- Criar pedido (agora com escopo) ----------
DROP FUNCTION IF EXISTS public.create_workout_request(uuid, date, text, date, time, text);
CREATE OR REPLACE FUNCTION public.create_workout_request(p_workout uuid, p_from date, p_kind text, p_to date, p_start time, p_message text, p_scope text DEFAULT 'single')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := public.today_brt(); _plan public.plans%ROWTYPE; _role text; _id uuid; _slot public.planned_slots%ROWTYPE;
  _target uuid; _title text; _link text; _conflicts date[] := '{}';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_kind NOT IN ('reschedule', 'cancel') THEN RAISE EXCEPTION 'INVALID_KIND'; END IF;
  IF p_scope NOT IN ('single', 'all') OR (p_scope = 'all' AND p_kind <> 'reschedule') THEN RAISE EXCEPTION 'INVALID_SCOPE'; END IF;
  SELECT p.* INTO _plan FROM public.workouts w JOIN public.plans p ON p.id = w.plan_id WHERE w.id = p_workout;
  IF NOT FOUND OR _plan.trainer_id IS NULL OR _plan.status <> 'active' THEN RAISE EXCEPTION 'NO_TRAINER'; END IF;

  IF _plan.student_id = public.current_student_id() THEN _role := 'student';
  ELSIF _plan.trainer_id = public.current_trainer_id()
        AND EXISTS (SELECT 1 FROM public.trainer_clients WHERE trainer_id = _plan.trainer_id AND student_id = _plan.student_id AND status = 'active') THEN _role := 'trainer';
  ELSE RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF p_from < _today OR p_from > _today + 14 THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;

  PERFORM public.materialize_slots(_plan.student_id, public.monday_of(p_from), public.monday_of(p_from) + 6);
  SELECT * INTO _slot FROM public.planned_slots WHERE workout_id = p_workout AND planned_date = p_from AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT _slot.accompanied THEN RAISE EXCEPTION 'NOT_ACCOMPANIED'; END IF;

  IF p_kind = 'reschedule' THEN
    IF p_to IS NULL OR p_start IS NULL THEN RAISE EXCEPTION 'MISSING_TARGET'; END IF;
    IF p_to < _today OR p_to > _today + 14 THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;
    IF p_scope = 'all' THEN
      IF _plan.cycle_weeks IS NULL THEN RAISE EXCEPTION 'NOT_RECURRING'; END IF;
      IF public.monday_of(p_to) <> public.monday_of(p_from) THEN RAISE EXCEPTION 'WEEK_MISMATCH'; END IF;
      -- A primeira data precisa estar livre; nas demais semanas o conflito é só um aviso (o profissional decide).
      IF NOT public.slot_is_free(_plan.trainer_id, p_to, p_start, p_workout, NULL, NULL) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
      _conflicts := public.recurrence_conflict_dates(p_workout, p_to, p_start);
    ELSIF NOT public.slot_is_free(_plan.trainer_id, p_to, p_start, p_workout, p_from, NULL) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
  END IF;

  BEGIN
    INSERT INTO public.workout_requests (kind, plan_id, workout_id, student_id, trainer_id, requested_by, created_by, from_date, to_date, to_start, message, scope, conflict_dates)
    VALUES (p_kind, _plan.id, p_workout, _plan.student_id, _plan.trainer_id, _role, auth.uid(), p_from,
            CASE WHEN p_kind = 'reschedule' THEN p_to END, CASE WHEN p_kind = 'reschedule' THEN p_start END, NULLIF(trim(p_message), ''), p_scope, _conflicts)
    RETURNING id INTO _id;
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'ALREADY_PENDING';
  END;

  _target := CASE WHEN _role = 'student' THEN public.user_of_trainer(_plan.trainer_id) ELSE public.user_of_student(_plan.student_id) END;
  _link := CASE WHEN _role = 'student' THEN '/dashboard/trainer/requests' ELSE '/dashboard/student/requests' END;
  _title := CASE WHEN p_kind = 'cancel' THEN 'Pedido de cancelamento de treino'
                 WHEN p_scope = 'all' THEN 'Pedido de mudança de treino em todas as semanas'
                 ELSE 'Pedido de mudança de treino' END;
  IF _target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_target, 'solicitacao', _title, 'Há uma nova solicitação para responder em Solicitações.', _link);
  END IF;
  RETURN _id;
END $$;

-- ---------- Responder ----------
CREATE OR REPLACE FUNCTION public.respond_workout_request(p_id uuid, p_action text, p_to date, p_start time, p_message text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.workout_requests%ROWTYPE; _today date := public.today_brt(); _is_receiver boolean; _new uuid;
  _other uuid; _title text; _conflicts date[] := '{}';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_action NOT IN ('accept', 'decline', 'counter') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  SELECT * INTO _r FROM public.workout_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'NOT_PENDING'; END IF;

  _is_receiver := COALESCE((_r.requested_by = 'student' AND _r.trainer_id = public.current_trainer_id())
               OR (_r.requested_by = 'trainer' AND _r.student_id = public.current_student_id()), false);
  IF NOT _is_receiver THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF _r.from_date < _today THEN RAISE EXCEPTION 'EXPIRED'; END IF;

  -- Quem pediu recebe o aviso da resposta.
  _other := CASE WHEN _r.requested_by = 'student' THEN public.user_of_student(_r.student_id) ELSE public.user_of_trainer(_r.trainer_id) END;

  IF p_action = 'accept' THEN
    IF _r.kind = 'reschedule' THEN
      IF _r.to_date < _today THEN RAISE EXCEPTION 'EXPIRED'; END IF;
      IF _r.scope = 'all' THEN
        IF NOT public.slot_is_free(_r.trainer_id, _r.to_date, _r.to_start, _r.workout_id, NULL, _r.id) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
        PERFORM public.apply_workout_recurring_change(_r.workout_id, _r.from_date, _r.to_date, _r.to_start);
      ELSE
        IF NOT public.slot_is_free(_r.trainer_id, _r.to_date, _r.to_start, _r.workout_id, _r.from_date, _r.id) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
        PERFORM public.apply_workout_change(_r.workout_id, _r.from_date, _r.to_date, _r.to_start, false);
      END IF;
    ELSE
      PERFORM public.apply_workout_change(_r.workout_id, _r.from_date, NULL, NULL, true);
    END IF;
    UPDATE public.workout_requests SET status = 'accepted', responded_at = now(), response_message = NULLIF(trim(p_message), '') WHERE id = _r.id;
    _title := 'Solicitação aceita';
  ELSIF p_action = 'decline' THEN
    UPDATE public.workout_requests SET status = 'declined', responded_at = now(), response_message = NULLIF(trim(p_message), '') WHERE id = _r.id;
    _title := 'Solicitação recusada';
  ELSE
    IF p_to IS NULL OR p_start IS NULL THEN RAISE EXCEPTION 'MISSING_TARGET'; END IF;
    IF p_to < _today OR p_to > _today + 14 THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;
    -- O pedido original deixa de ser pendente (e de reservar o horário dele) antes de conferir o novo.
    UPDATE public.workout_requests SET status = 'countered', responded_at = now(), response_message = NULLIF(trim(p_message), '') WHERE id = _r.id;
    IF _r.scope = 'all' THEN
      IF public.monday_of(p_to) <> public.monday_of(_r.from_date) THEN RAISE EXCEPTION 'WEEK_MISMATCH'; END IF;
      IF NOT public.slot_is_free(_r.trainer_id, p_to, p_start, _r.workout_id, NULL, NULL) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
      _conflicts := public.recurrence_conflict_dates(_r.workout_id, p_to, p_start);
    ELSIF NOT public.slot_is_free(_r.trainer_id, p_to, p_start, _r.workout_id, _r.from_date, NULL) THEN RAISE EXCEPTION 'SLOT_TAKEN';
    END IF;
    INSERT INTO public.workout_requests (kind, plan_id, workout_id, student_id, trainer_id, requested_by, created_by, from_date, to_date, to_start, message, parent_id, scope, conflict_dates)
    VALUES ('reschedule', _r.plan_id, _r.workout_id, _r.student_id, _r.trainer_id,
            CASE WHEN _r.requested_by = 'student' THEN 'trainer' ELSE 'student' END,
            auth.uid(), _r.from_date, p_to, p_start, NULLIF(trim(p_message), ''), _r.id, _r.scope, _conflicts)
    RETURNING id INTO _new;
    _title := 'Nova proposta de horário';
  END IF;

  IF _other IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_other, 'solicitacao', _title, 'Veja em Solicitações.',
            CASE WHEN _r.requested_by = 'student' THEN '/dashboard/student/requests' ELSE '/dashboard/trainer/requests' END);
  END IF;
  RETURN COALESCE(_new, _r.id);
END $$;

-- ---------- Permissões ----------
REVOKE EXECUTE ON FUNCTION public.recurrence_conflict_dates(uuid, date, time), public.apply_workout_recurring_change(uuid, date, date, time) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.workout_recurrence_conflicts(uuid, date, time), public.create_workout_request(uuid, date, text, date, time, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workout_recurrence_conflicts(uuid, date, time), public.create_workout_request(uuid, date, text, date, time, text, text) TO authenticated;