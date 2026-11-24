-- 0023 · O profissional muda o dia/horário de um treino direto da agenda e pausa o plano do aluno.
--  * trainer_change_workout: só o profissional dono do plano. Escopo 'single' (só aquela data) ou 'all' (todas as semanas,
--    daqui para frente; só planos em ciclo). Atualiza o treino no plano e a semana/agenda do aluno e avisa o aluno.
--    Em plano sem ciclo (treino de uma data só), mudar o dia/horário altera o próprio treino.
--  * pause_plan / resume_plan: o profissional pausa o plano dele (na hora, sem esperar a próxima segunda) e retoma.
--    Pausa feita pelo profissional só ele retoma (plan_pauses.by_trainer).

ALTER TABLE public.plan_pauses ADD COLUMN IF NOT EXISTS by_trainer boolean NOT NULL DEFAULT false;

-- ---------- Profissional muda um treino ----------
CREATE OR REPLACE FUNCTION public.trainer_change_workout(p_workout uuid, p_from date, p_to date, p_start time, p_scope text DEFAULT 'single')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := public.today_brt(); _wk public.workouts%ROWTYPE; _plan public.plans%ROWTYPE; _target uuid; _n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_scope NOT IN ('single', 'all') THEN RAISE EXCEPTION 'INVALID_SCOPE'; END IF;
  IF p_to IS NULL OR p_start IS NULL OR p_from IS NULL THEN RAISE EXCEPTION 'MISSING_TARGET'; END IF;

  SELECT * INTO _wk FROM public.workouts WHERE id = p_workout;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO _plan FROM public.plans WHERE id = _wk.plan_id;
  IF _plan.trainer_id IS NULL OR _plan.trainer_id IS DISTINCT FROM public.current_trainer_id() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF _plan.status <> 'active' OR (_plan.removed_at IS NOT NULL AND _plan.removed_at <= _today) THEN RAISE EXCEPTION 'PLAN_ENDED'; END IF;

  PERFORM public.materialize_slots(_plan.student_id, public.monday_of(LEAST(p_from, p_to)), public.monday_of(GREATEST(p_from, p_to)) + 6);

  IF p_scope = 'all' THEN
    IF _plan.cycle_weeks IS NULL THEN RAISE EXCEPTION 'NOT_RECURRING'; END IF;
    PERFORM public.apply_workout_recurring_change(p_workout, p_from, p_to, p_start);
  ELSIF _plan.cycle_weeks IS NULL THEN
    -- Treino de uma data só: o próprio treino muda de dia/horário.
    IF p_to < _today THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;
    UPDATE public.workouts SET workout_date = p_to, start_time = p_start WHERE id = p_workout;
    DELETE FROM public.planned_slots WHERE workout_id = p_workout AND status = 'pending';
    PERFORM public.materialize_slots(_plan.student_id, public.monday_of(p_to), public.monday_of(p_to) + 6);
  ELSE
    -- Treino de um ciclo, só nesta data.
    IF p_to < _today THEN RAISE EXCEPTION 'OUT_OF_RANGE'; END IF;
    IF p_to = p_from THEN
      UPDATE public.planned_slots SET start_time = p_start, accompanied = true, overridden = true
       WHERE workout_id = p_workout AND planned_date = p_from AND status = 'pending';
      GET DIAGNOSTICS _n = ROW_COUNT;
      IF _n = 0 THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    ELSE
      PERFORM public.apply_workout_change(p_workout, p_from, p_to, p_start, false);
    END IF;
  END IF;

  -- Pedidos de mudança pendentes desse treino perdem o sentido.
  UPDATE public.workout_requests SET status = 'withdrawn', responded_at = now()
   WHERE workout_id = p_workout AND status = 'pending' AND (p_scope = 'all' OR from_date = p_from);

  _target := public.user_of_student(_plan.student_id);
  IF _target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_target, 'treino', 'Seu professor alterou um treino', 'Veja o novo dia e horário em Treinos.', '/dashboard/student/workouts');
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.trainer_change_workout(uuid, date, date, time, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_change_workout(uuid, date, date, time, text) TO authenticated;

-- ---------- Pausar / retomar plano (aluno e profissional) ----------
CREATE OR REPLACE FUNCTION public.pause_plan(p_plan_id uuid) RETURNS date
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan public.plans%ROWTYPE; _is_trainer boolean; _eff date;
BEGIN
  SELECT * INTO _plan FROM public.plans WHERE id = p_plan_id AND removed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  _is_trainer := COALESCE(_plan.trainer_id IS NOT NULL AND _plan.trainer_id = public.current_trainer_id(), false);
  IF NOT (_is_trainer OR _plan.student_id = public.current_student_id()) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF EXISTS (SELECT 1 FROM public.plan_pauses WHERE plan_id = p_plan_id AND ends_on IS NULL) THEN RAISE EXCEPTION 'ALREADY_PAUSED'; END IF;

  -- O aluno pausa a partir da próxima segunda (ainda deve a semana); o profissional pausa na hora.
  _eff := CASE WHEN _is_trainer THEN public.today_brt() ELSE public.next_monday_brt() END;
  INSERT INTO public.plan_pauses (plan_id, student_id, starts_on, by_trainer) VALUES (p_plan_id, _plan.student_id, _eff, _is_trainer);

  IF _is_trainer THEN
    DELETE FROM public.planned_slots WHERE plan_id = p_plan_id AND status = 'pending' AND planned_date >= _eff;
    UPDATE public.workout_requests SET status = 'withdrawn', responded_at = now() WHERE plan_id = p_plan_id AND status = 'pending';
  END IF;
  RETURN _eff;
END $$;

CREATE OR REPLACE FUNCTION public.resume_plan(p_plan_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.plan_pauses%ROWTYPE; _plan public.plans%ROWTYPE; _is_trainer boolean;
BEGIN
  SELECT * INTO _plan FROM public.plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RETURN; END IF;
  _is_trainer := COALESCE(_plan.trainer_id IS NOT NULL AND _plan.trainer_id = public.current_trainer_id(), false);
  IF NOT (_is_trainer OR _plan.student_id = public.current_student_id()) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  SELECT * INTO _p FROM public.plan_pauses WHERE plan_id = p_plan_id AND ends_on IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  IF _p.by_trainer AND NOT _is_trainer THEN RAISE EXCEPTION 'PAUSED_BY_TRAINER'; END IF;

  IF _p.starts_on >= public.today_brt() THEN
    DELETE FROM public.plan_pauses WHERE id = _p.id;  -- a pausa ainda nem começou (ou só começou hoje)
  ELSE
    UPDATE public.plan_pauses SET ends_on = public.today_brt() - 1 WHERE id = _p.id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.pause_plan(uuid), public.resume_plan(uuid) TO authenticated;
