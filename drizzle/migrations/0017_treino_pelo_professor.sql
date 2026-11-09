-- 0016 · Treino feito pelo professor para o aluno + carga/repetições planejadas por série.
--  * workout_exercises.set_plan: planejado por série (jsonb [{ "weight": "20kg", "reps": "10" }, ...]); vazio = usa carga/reps do exercício.
--  * set_logs.planned_weight / planned_reps: o que estava planejado quando a série foi feita (histórico "planejado x feito").
--  * workout_executions.recorded_by_trainer: o treino foi lançado pelo professor (preenchido por trigger, não pelo cliente).
--  * O professor do plano (e vinculado ao aluno) pode registrar/editar execuções do aluno; o XP e o Foco seguem os gatilhos já existentes.

ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS set_plan jsonb;
ALTER TABLE public.set_logs ADD COLUMN IF NOT EXISTS planned_weight text;
ALTER TABLE public.set_logs ADD COLUMN IF NOT EXISTS planned_reps text;
ALTER TABLE public.workout_executions ADD COLUMN IF NOT EXISTS recorded_by_trainer boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.trainer_can_record(_student uuid, _workout uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_workout_trainer(_workout) AND public.is_linked_trainer_of_student(_student)
$$;

CREATE OR REPLACE FUNCTION public.trainer_owns_execution(_execution uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workout_executions e
     WHERE e.id = _execution AND public.trainer_can_record(e.student_id, e.workout_id)
  )
$$;

-- Execuções
DROP POLICY IF EXISTS "Trainer records executions" ON public.workout_executions;
CREATE POLICY "Trainer records executions" ON public.workout_executions FOR INSERT TO authenticated
  WITH CHECK (public.trainer_can_record(student_id, workout_id));
DROP POLICY IF EXISTS "Trainer updates executions" ON public.workout_executions;
CREATE POLICY "Trainer updates executions" ON public.workout_executions FOR UPDATE TO authenticated
  USING (public.trainer_can_record(student_id, workout_id))
  WITH CHECK (public.trainer_can_record(student_id, workout_id));

-- Exercícios e séries das execuções
DROP POLICY IF EXISTS "Trainer manages exercise logs" ON public.exercise_logs;
CREATE POLICY "Trainer manages exercise logs" ON public.exercise_logs FOR ALL TO authenticated
  USING (public.trainer_owns_execution(execution_id)) WITH CHECK (public.trainer_owns_execution(execution_id));

DROP POLICY IF EXISTS "Trainer manages set logs" ON public.set_logs;
CREATE POLICY "Trainer manages set logs" ON public.set_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercise_logs el WHERE el.id = exercise_log_id AND public.trainer_owns_execution(el.execution_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercise_logs el WHERE el.id = exercise_log_id AND public.trainer_owns_execution(el.execution_id)));

-- Marca quem lançou o treino (não confia no que o app enviar).
CREATE OR REPLACE FUNCTION public.mark_execution_recorder() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.recorded_by_trainer := NEW.student_id IS DISTINCT FROM public.current_student_id();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_a2_mark_execution_recorder ON public.workout_executions;
CREATE TRIGGER trg_a2_mark_execution_recorder BEFORE INSERT ON public.workout_executions
  FOR EACH ROW EXECUTE FUNCTION public.mark_execution_recorder();

REVOKE EXECUTE ON FUNCTION public.trainer_can_record(uuid, uuid), public.trainer_owns_execution(uuid), public.mark_execution_recorder() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_can_record(uuid, uuid), public.trainer_owns_execution(uuid) TO authenticated;
