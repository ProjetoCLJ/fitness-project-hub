ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cycle_weeks integer CHECK (cycle_weeks IS NULL OR cycle_weeks BETWEEN 1 AND 12);

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS week_index integer CHECK (week_index IS NULL OR week_index >= 0),
  ADD COLUMN IF NOT EXISTS weekday integer CHECK (weekday IS NULL OR weekday BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS workout_date date;
ALTER TABLE public.workouts ADD CONSTRAINT workouts_position_check CHECK (
  (workout_date IS NOT NULL AND weekday IS NULL AND week_index IS NULL)
  OR (workout_date IS NULL AND weekday IS NOT NULL AND week_index IS NOT NULL)
) NOT VALID;
COMMENT ON COLUMN public.workouts.day IS 'DEPRECATED: replaced by week_index/weekday or workout_date';

ALTER TABLE public.workout_executions
  ADD COLUMN IF NOT EXISTS workout_name text,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;
UPDATE public.workout_executions e SET workout_name = w.name, plan_id = w.plan_id
  FROM public.workouts w WHERE w.id = e.workout_id AND (e.workout_name IS NULL OR e.plan_id IS NULL);
ALTER TABLE public.workout_executions ALTER COLUMN workout_id DROP NOT NULL;
ALTER TABLE public.workout_executions DROP CONSTRAINT IF EXISTS workout_executions_workout_id_fkey;
ALTER TABLE public.workout_executions ADD CONSTRAINT workout_executions_workout_id_fkey
  FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.can_access_execution(_execution_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workout_executions e WHERE e.id = _execution_id
    AND (e.student_id = public.current_student_id()
         OR (e.plan_id IS NOT NULL AND public.is_plan_trainer(e.plan_id))
         OR (e.workout_id IS NOT NULL AND public.is_workout_trainer(e.workout_id))))
$$;

DROP POLICY IF EXISTS "Involved view executions" ON public.workout_executions;
DROP POLICY IF EXISTS "Student manages executions" ON public.workout_executions;
CREATE POLICY "Involved view executions" ON public.workout_executions FOR SELECT TO authenticated
  USING (student_id = public.current_student_id()
         OR (plan_id IS NOT NULL AND public.is_plan_trainer(plan_id))
         OR (workout_id IS NOT NULL AND public.is_workout_trainer(workout_id)));
CREATE POLICY "Student manages executions" ON public.workout_executions FOR ALL TO authenticated
  USING (student_id = public.current_student_id())
  WITH CHECK (student_id = public.current_student_id()
    AND (workout_id IS NULL OR public.can_access_workout(workout_id))
    AND (plan_id IS NULL OR public.can_access_plan(plan_id)));

CREATE TABLE public.student_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.student_restrictions TO authenticated;
GRANT ALL ON public.student_restrictions TO service_role;
ALTER TABLE public.student_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read restrictions" ON public.student_restrictions FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR trainer_id = public.current_trainer_id());
CREATE POLICY "Linked trainer adds restrictions" ON public.student_restrictions FOR INSERT TO authenticated
  WITH CHECK (trainer_id = public.current_trainer_id() AND public.is_linked_trainer_of_student(student_id));
CREATE POLICY "Parties delete restrictions" ON public.student_restrictions FOR DELETE TO authenticated
  USING (student_id = public.current_student_id() OR trainer_id = public.current_trainer_id());