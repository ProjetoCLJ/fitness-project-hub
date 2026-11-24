-- 0022 · Profissional que exclui um plano: vale na hora (antes só valia a partir da próxima segunda-feira).
--  * Excluir ("cancelled") um plano criado pelo próprio profissional: o plano deixa de valer hoje e os treinos
--    pendentes de hoje em diante saem da semana do aluno e da agenda (o que já foi feito continua registrado).
--  * Pedidos de mudança de treino pendentes desse plano são encerrados.
--  * Concluir um plano, e o atleta excluir o plano próprio, continuam valendo a partir da próxima segunda
--    (o atleta segue devendo os treinos da semana atual).

CREATE OR REPLACE FUNCTION public.remove_plan(p_plan_id uuid, p_status text DEFAULT 'cancelled') RETURNS date
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan public.plans%ROWTYPE; _today date := public.today_brt(); _eff date;
BEGIN
  IF p_status NOT IN ('cancelled', 'completed') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF NOT public.can_manage_plan(p_plan_id) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  SELECT * INTO _plan FROM public.plans WHERE id = p_plan_id;

  IF p_status = 'cancelled' AND _plan.trainer_id IS NOT NULL AND _plan.trainer_id = public.current_trainer_id() THEN
    _eff := _today;
  ELSE
    _eff := public.next_monday_brt();
  END IF;

  UPDATE public.plans
     SET status = p_status::public.plan_status, removed_at = _eff, end_date = GREATEST(_eff - 1, start_date)
   WHERE id = p_plan_id AND removed_at IS NULL;

  IF FOUND AND _eff = _today THEN
    DELETE FROM public.planned_slots WHERE plan_id = p_plan_id AND status = 'pending' AND planned_date >= _today;
    UPDATE public.workout_requests SET status = 'withdrawn', responded_at = now() WHERE plan_id = p_plan_id AND status = 'pending';
  END IF;
  RETURN _eff;
END $$;
