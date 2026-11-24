-- 0024 · Duração própria de cada treino acompanhado + horários do aluno só dentro do expediente do professor.
--  * workouts.duration_minutes / planned_slots.duration_minutes: o treino acompanhado não precisa durar 1 hora (15 a 480 min).
--    A agenda, os horários livres e os pedidos de mudança usam a duração de cada treino.
--  * trainer_agenda_availability: devolve o dia inteiro (00h–23h) e marca 'off' o que está fora do expediente do professor;
--    o app do aluno só mostra as horas de expediente (livres ou ocupadas).
--  * trainer_change_workout: o profissional também pode mudar a duração.

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60;
ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_duration_check;
ALTER TABLE public.workouts ADD CONSTRAINT workouts_duration_check CHECK (duration_minutes BETWEEN 15 AND 480);
ALTER TABLE public.planned_slots ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60;

-- Mudança no treino vale para os treinos pendentes que o aluno não ajustou (agora também a duração).
CREATE OR REPLACE FUNCTION public.workout_propagate_options() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.planned_slots
     SET accompanied = NEW.accompanied, start_time = NEW.start_time, duration_minutes = NEW.duration_minutes
   WHERE workout_id = NEW.id AND status = 'pending' AND planned_date >= public.today_brt() AND NOT overridden;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_workouts_propagate_options ON public.workouts;
CREATE TRIGGER trg_workouts_propagate_options AFTER UPDATE OF accompanied, start_time, duration_minutes ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.workout_propagate_options();

-- ---------- Gerador de treinos planejados: copia a duração ----------
CREATE OR REPLACE FUNCTION public.materialize_slots(p_student uuid, p_from date, p_to date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; _since date;
BEGIN
  SELECT g.tracking_since INTO _since
  FROM public.gm_state g JOIN public.profiles p ON p.user_id = g.user_id
  JOIN public.student_profiles sp ON sp.profile_id = p.id WHERE sp.id = p_student;
  IF _since IS NOT NULL THEN p_from := GREATEST(p_from, _since); END IF;
  IF p_from > p_to THEN RETURN 0; END IF;

  INSERT INTO public.planned_slots (student_id, plan_id, workout_id, workout_name, planned_date, week_start, accompanied, start_time, duration_minutes)
  SELECT p.student_id, p.id, w.id, w.name, days.d, public.monday_of(days.d), w.accompanied, w.start_time, w.duration_minutes
  FROM (SELECT g::date AS d FROM generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') g) days
  JOIN public.plans p ON p.student_id = p_student
  JOIN public.workouts w ON w.plan_id = p.id
  WHERE days.d >= p.start_date
    AND (p.deadline IS NULL OR days.d <= p.deadline)
    AND ((p.removed_at IS NULL AND p.status = 'active') OR (p.removed_at IS NOT NULL AND days.d < p.removed_at))
    AND (w.removed_at IS NULL OR days.d < w.removed_at)
    AND days.d >= (w.created_at AT TIME ZONE 'America/Sao_Paulo')::date
    AND NOT EXISTS (SELECT 1 FROM public.plan_pauses pp
                    WHERE pp.plan_id = p.id AND days.d >= pp.starts_on AND (pp.ends_on IS NULL OR days.d <= pp.ends_on))
    AND NOT EXISTS (SELECT 1 FROM public.slot_exceptions x WHERE x.workout_id = w.id AND x.date = days.d)
    AND ((p.cycle_weeks IS NULL AND w.workout_date = days.d)
      OR (p.cycle_weeks IS NOT NULL AND w.weekday = extract(dow FROM days.d)::int
          AND w.week_index = (((public.monday_of(days.d) - public.monday_of(p.start_date)) / 7) % p_cycle_weeks)))
  ON CONFLICT (workout_id, planned_date) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ---------- Aplicar uma mudança aceita: o treino movido mantém a duração ----------
CREATE OR REPLACE FUNCTION public.apply_workout_change(p_workout uuid, p_from date, p_to date, p_start time, p_cancel boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _slot public.planned_slots%ROWTYPE; _student uuid;
BEGIN
  SELECT p.student_id INTO _student FROM public.workouts w JOIN public.plans p ON p.id = w.plan_id WHERE w.id = p_workout;
  PERFORM public.materialize_slots(_student, public.monday_of(p_from), public.monday_of(p_from) + 6);
  SELECT * INTO _slot FROM public.planned_slots WHERE workout_id = p_workout AND planned_date = p_from AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF NOT p_cancel THEN
    IF EXISTS (SELECT 1 FROM public.planned_slots WHERE workout_id = p_workout AND planned_date = p_to) THEN RAISE EXCEPTION 'ALREADY_SCHEDULED'; END IF;
  END IF;

  INSERT INTO public.slot_exceptions (workout_id, date, reason) VALUES (p_workout, p_from, CASE WHEN p_cancel THEN 'cancelled' ELSE 'moved' END)
  ON CONFLICT (workout_id, date) DO UPDATE SET reason = EXCLUDED.reason;
  DELETE FROM public.planned_slots WHERE id = _slot.id;

  IF NOT p_cancel THEN
    INSERT INTO public.planned_slots (student_id, plan_id, workout_id, workout_name, planned_date, week_start, accompanied, start_time, duration_minutes, overridden, moved_from)
    VALUES (_slot.student_id, _slot.plan_id, p_workout, _slot.workout_name, p_to, public.monday_of(p_to), true, p_start, _slot.duration_minutes, true, p_from);
    -- Se o dia novo tinha sido dispensado antes, ele volta a valer.
    DELETE FROM public.slot_exceptions WHERE workout_id = p_workout AND date = p_to;
  END IF;
END $$;

-- ---------- Agenda do profissional: livre / ocupado / fora do expediente ----------
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
       hours AS (SELECT h, make_time(h, 0, 0) AS s, (CASE WHEN h = 23 THEN time '23:59:59' ELSE make_time(h + 1, 0, 0) END) AS e FROM generate_series(0, 23) h),
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
           -- fora do expediente do professor: o aluno nem vê essa hora
           WHEN NOT EXISTS (SELECT 1 FROM ev WHERE ev.d = grid.d AND ev.type = 'expediente' AND ev.st < grid.e AND ev.en > grid.s) THEN 'off'
           WHEN grid.d < _today OR (grid.d = _today AND grid.h <= _now_h) THEN 'busy'
           WHEN EXISTS (SELECT 1 FROM ev WHERE ev.d = grid.d AND ev.type IN ('aula', 'bloqueado') AND ev.st < grid.e AND ev.en > grid.s) THEN 'busy'
           WHEN EXISTS (SELECT 1 FROM public.planned_slots s JOIN public.plans pl ON pl.id = s.plan_id
                         WHERE pl.trainer_id = p_trainer AND s.accompanied AND s.start_time IS NOT NULL AND s.status IN ('pending', 'done')
                           AND s.planned_date = grid.d
                           AND (extract(epoch FROM s.start_time) / 60) < (grid.h + 1) * 60
                           AND (extract(epoch FROM s.start_time) / 60 + s.duration_minutes) > grid.h * 60
                           AND NOT (s.workout_id IS NOT DISTINCT FROM p_exclude_workout AND (p_exclude_date IS NULL OR s.planned_date = p_exclude_date))) THEN 'busy'
           WHEN EXISTS (SELECT 1 FROM public.workout_requests r JOIN public.workouts rw ON rw.id = r.workout_id
                         WHERE r.trainer_id = p_trainer AND r.status = 'pending' AND r.kind = 'reschedule'
                           AND r.id IS DISTINCT FROM p_exclude_request
                           AND r.to_date = grid.d
                           AND (extract(epoch FROM r.to_start) / 60) < (grid.h + 1) * 60
                           AND (extract(epoch FROM r.to_start) / 60 + rw.duration_minutes) > grid.h * 60) THEN 'busy'
           ELSE 'free'
         END)::text
  FROM grid
  ORDER BY grid.d, grid.s;
END $$;

-- Confere (no servidor) se o horário pedido está livre durante toda a duração do treino.
CREATE OR REPLACE FUNCTION public.slot_is_free(p_trainer uuid, p_date date, p_start time, p_exclude_workout uuid, p_exclude_date date, p_exclude_request uuid, p_duration integer DEFAULT 60)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(bool_and(a.status = 'free'), false)
    FROM public.trainer_agenda_availability(p_trainer, p_date, p_date, p_exclude_workout, p_exclude_date, p_exclude_request) a
   WHERE (extract(epoch FROM a.slot_start) / 60) < (extract(epoch FROM p_start) / 60 + p_duration)
     AND (CASE WHEN a.slot_end = time '23:59:59' THEN 1440 ELSE extract(epoch FROM a.slot_end) / 60 END) > (extract(epoch FROM p_start) / 60)
$$;

-- ---------- Pedidos de mudança: conferem a duração do treino ----------
CREATE OR REPLACE FUNCTION public.recurrence_conflict_dates(p_workout uuid, p_to date, p_start time) RETURNS date[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan public.plans%ROWTYPE; k integer; d date; _out date[] := '{}';
BEGIN
  SELECT p.* INTO _plan FROM public.workouts w JOIN public.plans p ON p.id = w.plan_id WHERE w.id = p_workout;
  IF NOT FOUND OR _plan.cycle_weeks IS NULL OR _plan.trainer_id IS NULL THEN RETURN _out; END IF;
  FOR k IN 1..7 LOOP
    d := p_to + 7 * _plan.cycle_weeks * k;
    EXIT WHEN _plan.deadline IS NOT NULL AND d > _plan.deadline;
    IF NOT public.slot_is_free(_plan.trainer_id, d, p_start, p_workout, NULL, NULL, (SELECT duration_minutes FROM public.workouts WHERE id = p_workout)) THEN _out := _out || d; END IF;
  END LOOP;
  RETURN _out;
END $$;

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
      IF NOT public.slot_is_free(_plan.trainer_id, p_to, p_start, p_workout, NULL, NULL, (SELECT duration_minutes FROM public.workouts WHERE id = p_workout)) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
      _conflicts := public.recurrence_conflict_dates(p_workout, p_to, p_start);
    ELSIF NOT public.slot_is_free(_plan.trainer_id, p_to, p_start, p_workout, p_from, NULL, (SELECT duration_minutes FROM public.workouts WHERE id = p_workout)) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
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
        IF NOT public.slot_is_free(_r.trainer_id, _r.to_date, _r.to_start, _r.workout_id, NULL, _r.id, (SELECT duration_minutes FROM public.workouts WHERE id = _r.workout_id)) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
        PERFORM public.apply_workout_recurring_change(_r.workout_id, _r.from_date, _r.to_date, _r.to_start);
      ELSE
        IF NOT public.slot_is_free(_r.trainer_id, _r.to_date, _r.to_start, _r.workout_id, _r.from_date, _r.id, (SELECT duration_minutes FROM public.workouts WHERE id = _r.workout_id)) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
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
      IF NOT public.slot_is_free(_r.trainer_id, p_to, p_start, _r.workout_id, NULL, NULL, (SELECT duration_minutes FROM public.workouts WHERE id = _r.workout_id)) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
      _conflicts := public.recurrence_conflict_dates(_r.workout_id, p_to, p_start);
    ELSIF NOT public.slot_is_free(_r.trainer_id, p_to, p_start, _r.workout_id, _r.from_date, NULL, (SELECT duration_minutes FROM public.workouts WHERE id = _r.workout_id)) THEN RAISE EXCEPTION 'SLOT_TAKEN';
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

-- ---------- Profissional muda um treino (agora também a duração) ----------
DROP FUNCTION IF EXISTS public.trainer_change_workout(uuid, date, date, time, text);
CREATE OR REPLACE FUNCTION public.trainer_change_workout(p_workout uuid, p_from date, p_to date, p_start time, p_scope text DEFAULT 'single', p_duration integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := public.today_brt(); _wk public.workouts%ROWTYPE; _plan public.plans%ROWTYPE; _target uuid; _n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_scope NOT IN ('single', 'all') THEN RAISE EXCEPTION 'INVALID_SCOPE'; END IF;
  IF p_to IS NULL OR p_start IS NULL OR p_from IS NULL THEN RAISE EXCEPTION 'MISSING_TARGET'; END IF;
  IF p_duration IS NOT NULL AND p_duration NOT BETWEEN 15 AND 480 THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;

  SELECT * INTO _wk FROM public.workouts WHERE id = p_workout;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO _plan FROM public.plans WHERE id = _wk.plan_id;
  IF _plan.trainer_id IS NULL OR _plan.trainer_id IS DISTINCT FROM public.current_trainer_id() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF _plan.status <> 'active' OR (_plan.removed_at IS NOT NULL AND _plan.removed_at <= _today) THEN RAISE EXCEPTION 'PLAN_ENDED'; END IF;

  PERFORM public.materialize_slots(_plan.student_id, public.monday_of(LEAST(p_from, p_to)), public.monday_of(GREATEST(p_from, p_to)) + 6);

  IF p_scope = 'all' THEN
    IF _plan.cycle_weeks IS NULL THEN RAISE EXCEPTION 'NOT_RECURRING'; END IF;
    IF p_duration IS NOT NULL THEN UPDATE public.workouts SET duration_minutes = p_duration WHERE id = p_workout; END IF;
    PERFORM public.apply_workout_recurring_change(p_workout, p_from, p_to, p_start);
  ELSIF _plan.cycle_weeks IS NULL THEN
    -- Treino de uma data só: o próprio treino muda de dia/horário/duração.
    IF p_to < _today THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;
    UPDATE public.workouts SET workout_date = p_to, start_time = p_start, duration_minutes = COALESCE(p_duration, duration_minutes) WHERE id = p_workout;
    DELETE FROM public.planned_slots WHERE workout_id = p_workout AND status = 'pending';
    PERFORM public.materialize_slots(_plan.student_id, public.monday_of(p_to), public.monday_of(p_to) + 6);
  ELSE
    -- Treino de um ciclo, só nesta data.
    IF p_to < _today THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;
    IF p_to = p_from THEN
      UPDATE public.planned_slots SET start_time = p_start, accompanied = true, overridden = true, duration_minutes = COALESCE(p_duration, duration_minutes)
       WHERE workout_id = p_workout AND planned_date = p_from AND status = 'pending';
      GET DIAGNOSTICS _n = ROW_COUNT;
      IF _n = 0 THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    ELSE
      PERFORM public.apply_workout_change(p_workout, p_from, p_to, p_start, false);
      IF p_duration IS NOT NULL THEN
        UPDATE public.planned_slots SET duration_minutes = p_duration WHERE workout_id = p_workout AND planned_date = p_to;
      END IF;
    END IF;
  END IF;

  UPDATE public.workout_requests SET status = 'withdrawn', responded_at = now()
   WHERE workout_id = p_workout AND status = 'pending' AND (p_scope = 'all' OR from_date = p_from);

  _target := public.user_of_student(_plan.student_id);
  IF _target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_target, 'treino', 'Seu professor alterou um treino', 'Veja o novo dia e horário em Treinos.', '/dashboard/student/workouts');
  END IF;
END $$;

-- ---------- Permissões ----------
DROP FUNCTION IF EXISTS public.slot_is_free(uuid, date, time, uuid, date, uuid);
REVOKE EXECUTE ON FUNCTION public.slot_is_free(uuid, date, time, uuid, date, uuid, integer), public.materialize_slots(uuid, date, date),
  public.apply_workout_change(uuid, date, date, time, boolean), public.recurrence_conflict_dates(uuid, date, time) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trainer_change_workout(uuid, date, date, time, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_change_workout(uuid, date, date, time, text, integer) TO authenticated;