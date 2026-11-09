-- 0017 · Treinos acompanhados aparecem na agenda do profissional.
-- A agenda lê os treinos acompanhados direto dos planos (sem duplicar eventos); para refletir os ajustes
-- "só desta vez" do aluno (horário/acompanhado por dia), o profissional precisa ler os planned_slots dos planos dele.

DROP POLICY IF EXISTS "Trainer reads slots of own plans" ON public.planned_slots;
CREATE POLICY "Trainer reads slots of own plans" ON public.planned_slots FOR SELECT TO authenticated
  USING (public.is_plan_trainer(plan_id));
