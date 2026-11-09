-- 0018 · Solicitações de mudança de treino entre aluno e profissional (nos dois sentidos).
--  * workout_requests: pedido de mudança de horário/dia ou cancelamento de UM treino acompanhado. Quem recebe aceita,
--    recusa ou propõe outro horário (a contraproposta vira um novo pedido ligado ao anterior).
--  * Aceitar aplica na hora: o treino daquele dia muda de data/horário (ou deixa de existir) na semana do aluno e na agenda.
--  * slot_exceptions: dias em que um treino do plano NÃO acontece (movido ou cancelado); o gerador de treinos planejados respeita.
--  * planned_slots.moved_from: treino que foi movido de outro dia.
--  * trainer_agenda_availability: mostra ao aluno só "livre"/"ocupado" por hora na agenda do profissional (sem detalhes).
-- Tudo é feito por funções (o app não escreve direto nas tabelas).

-- ---------- Tabelas ----------
CREATE TABLE IF NOT EXISTS public.slot_exceptions (
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason text NOT NULL DEFAULT 'moved' CHECK (reason IN ('moved', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workout_id, date)
);

ALTER TABLE public.planned_slots ADD COLUMN IF NOT EXISTS moved_from date;

CREATE TABLE IF NOT EXISTS public.workout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('reschedule', 'cancel')),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  requested_by text NOT NULL CHECK (requested_by IN ('student', 'trainer')),
  created_by uuid NOT NULL,
  from_date date NOT NULL,
  to_date date,
  to_start time,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'countered', 'withdrawn')),
  parent_id uuid REFERENCES public.workout_requests(id) ON DELETE SET NULL,
  response_message text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'reschedule' OR (to_date IS NOT NULL AND to_start IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS workout_requests_one_pending ON public.workout_requests (workout_id, from_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS workout_requests_student ON public.workout_requests (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workout_requests_trainer ON public.workout_requests (trainer_id, created_at DESC);

ALTER TABLE public.slot_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.slot_exceptions, public.workout_requests TO authenticated;
GRANT ALL ON public.slot_exceptions, public.workout_requests TO service_role;

DROP POLICY IF EXISTS "Involved read slot exceptions" ON public.slot_exceptions;
CREATE POLICY "Involved read slot exceptions" ON public.slot_exceptions FOR SELECT TO authenticated
  USING (public.can_access_workout(workout_id));

DROP POLICY IF EXISTS "Parties read workout requests" ON public.workout_requests;
CREATE POLICY "Parties read workout requests" ON public.workout_requests FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR trainer_id = public.current_trainer_id());

-- ---------- Gerador de treinos planejados: respeita dias movidos/cancelados ----------
CREATE OR REPLACE FUNCTION public.materialize_slots(p_student uuid, p_from date, p_to date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; _since date;
BEGIN
  SELECT g.tracking_since INTO _since
  FROM public.gm_state g JOIN public.profiles p ON p.user_id = g.user_id
  JOIN public.student_profiles sp ON sp.profile_id = p.id WHERE sp.id = p_student;
  IF _since IS NOT NULL THEN p_from := GREATEST(p_from, _since); END IF;
  IF p_from > p_to THEN RETURN 0; END IF;

  INSERT INTO public.planned_slots (student_id, plan_id, workout_id, workout_name, planned_date, week_start, accompanied, start_time)
  SELECT p.student_id, p.id, w.id, w.name, days.d, public.monday_of(days.d), w.accompanied, w.start_time
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
          AND w.week_index = (((public.monday_of(days.d) - public.monday_of(p.start_date)) / 7) % p.cycle_weeks)))
  ON CONFLICT (workout_id, planned_date) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ---------- Auxiliares ----------
CREATE OR REPLACE FUNCTION public.user_of_student(_student uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id WHERE sp.id = _student
$$;

CREATE OR REPLACE FUNCTION public.user_of_trainer(_trainer uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id FROM public.trainer_profiles tp JOIN public.profiles p ON p.id = tp.profile_id WHERE tp.id = _trainer
$$;

CREATE OR REPLACE FUNCTION public.can_see_trainer_agenda(_trainer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(_trainer = public.current_trainer_id(), false)
      OR EXISTS (SELECT 1 FROM public.trainer_clients tc
                  WHERE tc.trainer_id = _trainer AND tc.student_id = public.current_student_id() AND tc.status = 'active')
$$;

-- ---------- Agenda do profissional só com livre/ocupado ----------
-- Para cada hora (06h–22h) dos dias pedidos: 'free' se está dentro de um expediente e sem aula, bloqueio, treino acompanhado
-- de outro aluno ou pedido pendente; 'busy' em qualquer outro caso (inclusive fora do expediente e horários que já passaram).
CREATE OR REPLACE FUNCTION public.trainer_agenda_availability(
  p_trainer uuid, p_from date, p_to date,
  p_exclude_workout uuid DEFAULT NULL, p_exclude_date date DEFAULT NULL, p_exclude_request uuid DEFAULT NULL)
RETURNS TABLE (day date, slot_start time, slot_end time, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := public.today_brt(); _now_h integer := extract(hour FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::integer;
BEGIN
  IF NOT COALESCE(public.can_see_trainer_agenda(p_trainer), false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF p_to < p_from OR p_to - p_from > 31 THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;

  -- Os treinos planejados só existem nas semanas já geradas: gera o período pedido para os alunos do profissional
  -- (idempotente), para que o treino acompanhado de cada aluno apareça como ocupado.
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
                           AND NOT (s.workout_id IS NOT DISTINCT FROM p_exclude_workout AND s.planned_date IS NOT DISTINCT FROM p_exclude_date)) THEN 'busy'
           WHEN EXISTS (SELECT 1 FROM public.workout_requests r
                         WHERE r.trainer_id = p_trainer AND r.status = 'pending' AND r.kind = 'reschedule'
                           AND r.id IS DISTINCT FROM p_exclude_request
                           AND r.to_date = grid.d AND r.to_start < grid.e AND (r.to_start + interval '60 minutes') > grid.s) THEN 'busy'
           ELSE 'free'
         END)::text
  FROM grid
  ORDER BY grid.d, grid.s;
END $$;

-- Confere (no servidor) se o horário pedido está mesmo livre. O treino dura 60 min e pode atravessar duas horas cheias.
CREATE OR REPLACE FUNCTION public.slot_is_free(p_trainer uuid, p_date date, p_start time, p_exclude_workout uuid, p_exclude_date date, p_exclude_request uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(bool_and(a.status = 'free'), false)
    FROM public.trainer_agenda_availability(p_trainer, p_date, p_date, p_exclude_workout, p_exclude_date, p_exclude_request) a
   WHERE a.slot_start < (p_start + interval '60 minutes') AND a.slot_end > p_start
$$;

-- ---------- Aplicar uma mudança aceita ----------
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
    INSERT INTO public.planned_slots (student_id, plan_id, workout_id, workout_name, planned_date, week_start, accompanied, start_time, overridden, moved_from)
    VALUES (_slot.student_id, _slot.plan_id, p_workout, _slot.workout_name, p_to, public.monday_of(p_to), true, p_start, true, p_from);
    -- Se o dia novo tinha sido dispensado antes, ele volta a valer.
    DELETE FROM public.slot_exceptions WHERE workout_id = p_workout AND date = p_to;
  END IF;
END $$;

-- ---------- Criar pedido ----------
CREATE OR REPLACE FUNCTION public.create_workout_request(p_workout uuid, p_from date, p_kind text, p_to date, p_start time, p_message text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := public.today_brt(); _plan public.plans%ROWTYPE; _role text; _id uuid; _slot public.planned_slots%ROWTYPE;
  _target uuid; _title text; _link text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_kind NOT IN ('reschedule', 'cancel') THEN RAISE EXCEPTION 'INVALID_KIND'; END IF;
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
    IF NOT public.slot_is_free(_plan.trainer_id, p_to, p_start, p_workout, p_from, NULL) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
  END IF;

  BEGIN
    INSERT INTO public.workout_requests (kind, plan_id, workout_id, student_id, trainer_id, requested_by, created_by, from_date, to_date, to_start, message)
    VALUES (p_kind, _plan.id, p_workout, _plan.student_id, _plan.trainer_id, _role, auth.uid(), p_from,
            CASE WHEN p_kind = 'reschedule' THEN p_to END, CASE WHEN p_kind = 'reschedule' THEN p_start END, NULLIF(trim(p_message), ''))
    RETURNING id INTO _id;
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'ALREADY_PENDING';
  END;

  _target := CASE WHEN _role = 'student' THEN public.user_of_trainer(_plan.trainer_id) ELSE public.user_of_student(_plan.student_id) END;
  _link := CASE WHEN _role = 'student' THEN '/dashboard/trainer/requests' ELSE '/dashboard/student/requests' END;
  _title := CASE WHEN p_kind = 'cancel' THEN 'Pedido de cancelamento de treino' ELSE 'Pedido de mudança de treino' END;
  IF _target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_target, 'solicitacao', _title, 'Há uma nova solicitação para responder em Solicitações.', _link);
  END IF;
  RETURN _id;
END $$;

-- ---------- Responder (aceitar / recusar / propor outro horário) ----------
CREATE OR REPLACE FUNCTION public.respond_workout_request(p_id uuid, p_action text, p_to date, p_start time, p_message text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.workout_requests%ROWTYPE; _today date := public.today_brt(); _is_receiver boolean; _new uuid;
  _other uuid; _title text;
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
      IF NOT public.slot_is_free(_r.trainer_id, _r.to_date, _r.to_start, _r.workout_id, _r.from_date, _r.id) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
    END IF;
    PERFORM public.apply_workout_change(_r.workout_id, _r.from_date, _r.to_date, _r.to_start, _r.kind = 'cancel');
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
    IF NOT public.slot_is_free(_r.trainer_id, p_to, p_start, _r.workout_id, _r.from_date, NULL) THEN RAISE EXCEPTION 'SLOT_TAKEN'; END IF;
    INSERT INTO public.workout_requests (kind, plan_id, workout_id, student_id, trainer_id, requested_by, created_by, from_date, to_date, to_start, message, parent_id)
    VALUES ('reschedule', _r.plan_id, _r.workout_id, _r.student_id, _r.trainer_id,
            CASE WHEN _r.requested_by = 'student' THEN 'trainer' ELSE 'student' END,
            auth.uid(), _r.from_date, p_to, p_start, NULLIF(trim(p_message), ''), _r.id)
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

-- ---------- Retirar um pedido que eu mesmo enviei ----------
CREATE OR REPLACE FUNCTION public.withdraw_workout_request(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.workout_requests SET status = 'withdrawn', responded_at = now()
   WHERE id = p_id AND status = 'pending' AND created_by = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
END $$;

-- ---------- Permissões ----------
REVOKE EXECUTE ON FUNCTION public.apply_workout_change(uuid, date, date, time, boolean), public.slot_is_free(uuid, date, time, uuid, date, uuid),
  public.user_of_student(uuid), public.user_of_trainer(uuid), public.materialize_slots(uuid, date, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_see_trainer_agenda(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_trainer_agenda(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.trainer_agenda_availability(uuid, date, date, uuid, date, uuid), public.create_workout_request(uuid, date, text, date, time, text),
  public.respond_workout_request(uuid, text, date, time, text), public.withdraw_workout_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_agenda_availability(uuid, date, date, uuid, date, uuid), public.create_workout_request(uuid, date, text, date, time, text),
  public.respond_workout_request(uuid, text, date, time, text), public.withdraw_workout_request(uuid) TO authenticated;