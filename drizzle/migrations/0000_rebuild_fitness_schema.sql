CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS
CREATE TYPE public.user_role AS ENUM ('trainer','student');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','rejected','suggested');
CREATE TYPE public.schedule_event_type AS ENUM ('aula','bloqueado','fora_expediente');
CREATE TYPE public.schedule_recurrence AS ENUM ('once','weekly');
CREATE TYPE public.plan_status AS ENUM ('active','completed');

-- TABLES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  birth_date date,
  gender text CHECK (gender IN ('male','female','other')),
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.trainer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cref text,
  experience_years integer DEFAULT 0,
  description text,
  objectives text,
  base_price numeric(10,2) DEFAULT 0,
  start_date date,
  instagram text,
  facebook text,
  linkedin text,
  rating numeric(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  total_students integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text,
  fitness_goals text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trainer_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (trainer_id, specialty_id)
);

CREATE TABLE public.trainer_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active','pending')),
  custom_price numeric(10,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE (trainer_id, student_id)
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status public.booking_status DEFAULT 'pending',
  price numeric(10,2),
  location text,
  suggested_date date,
  suggested_start_time time,
  suggested_end_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  type public.schedule_event_type NOT NULL,
  title text,
  recurrence public.schedule_recurrence NOT NULL,
  date date,
  weekdays integer[],
  start_date date NOT NULL,
  end_date date,
  excluded_dates date[] DEFAULT '{}',
  start_time time NOT NULL,
  end_time time NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.schedule_event_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  UNIQUE (event_id, student_id)
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  objective text,
  deadline date,
  training_strategy text,
  training_approach text,
  progress integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status public.plan_status DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  day text,
  name text NOT NULL,
  observations text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer,
  reps text,
  load text,
  rest text,
  superset_group text,
  order_index integer DEFAULT 0
);

CREATE TABLE public.workout_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  observations text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.workout_executions(id) ON DELETE CASCADE,
  workout_exercise_id uuid REFERENCES public.workout_exercises(id) ON DELETE SET NULL,
  planned_name text NOT NULL,
  performed_name text NOT NULL,
  notes text,
  is_pr boolean DEFAULT false
);

CREATE TABLE public.set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_log_id uuid NOT NULL REFERENCES public.exercise_logs(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  weight text,
  reps text,
  effort integer
);

CREATE TABLE public.body_weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight numeric(5,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);

CREATE TABLE public.body_weight_goals (
  student_id uuid PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  goal numeric(5,2) NOT NULL
);

-- GRANTS
GRANT SELECT ON public.profiles, public.trainer_profiles, public.specialties, public.trainer_specialties, public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles, public.trainer_profiles, public.student_profiles, public.specialties, public.trainer_specialties,
  public.trainer_clients, public.bookings, public.schedule_events, public.schedule_event_students, public.reviews,
  public.payments, public.plans, public.plan_versions, public.workouts, public.workout_exercises,
  public.workout_executions, public.exercise_logs, public.set_logs, public.body_weight_entries, public.body_weight_goals
TO authenticated;
GRANT ALL ON
  public.profiles, public.trainer_profiles, public.student_profiles, public.specialties, public.trainer_specialties,
  public.trainer_clients, public.bookings, public.schedule_events, public.schedule_event_students, public.reviews,
  public.payments, public.plans, public.plan_versions, public.workouts, public.workout_exercises,
  public.workout_executions, public.exercise_logs, public.set_logs, public.body_weight_entries, public.body_weight_goals
TO service_role;

-- HELPER FUNCTIONS (security definer, evitam recursão de RLS)
CREATE OR REPLACE FUNCTION public.current_trainer_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tp.id FROM public.trainer_profiles tp JOIN public.profiles p ON p.id = tp.profile_id WHERE p.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_student_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.id FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id WHERE p.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_linked_trainer_of_student(_student_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trainer_clients WHERE student_id = _student_id AND trainer_id = public.current_trainer_id())
$$;

CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.trainer_clients tc ON tc.student_id = sp.id
    WHERE sp.profile_id = _profile_id AND tc.trainer_id = public.current_trainer_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_plan(_plan_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.plans WHERE id = _plan_id
    AND (student_id = public.current_student_id() OR trainer_id = public.current_trainer_id()))
$$;

CREATE OR REPLACE FUNCTION public.is_plan_trainer(_plan_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.plans WHERE id = _plan_id AND trainer_id = public.current_trainer_id())
$$;

CREATE OR REPLACE FUNCTION public.can_access_workout(_workout_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = _workout_id AND public.can_access_plan(w.plan_id))
$$;

CREATE OR REPLACE FUNCTION public.is_workout_trainer(_workout_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = _workout_id AND public.is_plan_trainer(w.plan_id))
$$;

CREATE OR REPLACE FUNCTION public.can_access_execution(_execution_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workout_executions e WHERE e.id = _execution_id
    AND (e.student_id = public.current_student_id() OR public.is_workout_trainer(e.workout_id)))
$$;

CREATE OR REPLACE FUNCTION public.owns_execution(_execution_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workout_executions e WHERE e.id = _execution_id AND e.student_id = public.current_student_id())
$$;

CREATE OR REPLACE FUNCTION public.can_access_event(_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.schedule_events WHERE id = _event_id AND trainer_id = public.current_trainer_id())
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_event_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_weight_goals ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Own profile select" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Public trainer profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (role = 'trainer');
CREATE POLICY "Linked trainer reads student profile" ON public.profiles FOR SELECT TO authenticated USING (public.can_view_profile(id));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own profile delete" ON public.profiles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- trainer_profiles
CREATE POLICY "Public active trainers" ON public.trainer_profiles FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Trainer manages own" ON public.trainer_profiles FOR ALL TO authenticated
  USING (id = public.current_trainer_id()) WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'trainer'));

-- student_profiles
CREATE POLICY "Student manages own" ON public.student_profiles FOR ALL TO authenticated
  USING (id = public.current_student_id()) WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'student'));
CREATE POLICY "Linked trainer reads student" ON public.student_profiles FOR SELECT TO authenticated USING (public.is_linked_trainer_of_student(id));

-- specialties
CREATE POLICY "Public specialties" ON public.specialties FOR SELECT TO anon, authenticated USING (true);

-- trainer_specialties
CREATE POLICY "Public trainer specialties" ON public.trainer_specialties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Trainer manages own specialties" ON public.trainer_specialties FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id()) WITH CHECK (trainer_id = public.current_trainer_id());

-- trainer_clients
CREATE POLICY "Involved can view link" ON public.trainer_clients FOR SELECT TO authenticated
  USING (trainer_id = public.current_trainer_id() OR student_id = public.current_student_id());
CREATE POLICY "Trainer manages links" ON public.trainer_clients FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id()) WITH CHECK (trainer_id = public.current_trainer_id());

-- bookings
CREATE POLICY "Involved manage bookings" ON public.bookings FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id() OR student_id = public.current_student_id())
  WITH CHECK (trainer_id = public.current_trainer_id() OR student_id = public.current_student_id());

-- schedule_events
CREATE POLICY "Authenticated read events" ON public.schedule_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainer manages events" ON public.schedule_events FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id()) WITH CHECK (trainer_id = public.current_trainer_id());

-- schedule_event_students
CREATE POLICY "Involved view event students" ON public.schedule_event_students FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR public.can_access_event(event_id));
CREATE POLICY "Trainer manages event students" ON public.schedule_event_students FOR ALL TO authenticated
  USING (public.can_access_event(event_id)) WITH CHECK (public.can_access_event(event_id));

-- reviews
CREATE POLICY "Public reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Student inserts own review" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (student_id = public.current_student_id()
    AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.student_id = public.current_student_id() AND b.trainer_id = reviews.trainer_id)));

-- payments
CREATE POLICY "Involved view payments" ON public.payments FOR SELECT TO authenticated
  USING (trainer_id = public.current_trainer_id() OR student_id = public.current_student_id());
CREATE POLICY "Trainer manages payments" ON public.payments FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id()) WITH CHECK (trainer_id = public.current_trainer_id());

-- plans
CREATE POLICY "Involved view plans" ON public.plans FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR trainer_id = public.current_trainer_id());
CREATE POLICY "Trainer manages plans" ON public.plans FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id()) WITH CHECK (trainer_id = public.current_trainer_id());

-- plan_versions
CREATE POLICY "Involved view plan versions" ON public.plan_versions FOR SELECT TO authenticated USING (public.can_access_plan(plan_id));
CREATE POLICY "Trainer inserts plan versions" ON public.plan_versions FOR INSERT TO authenticated WITH CHECK (public.is_plan_trainer(plan_id));

-- workouts
CREATE POLICY "Involved view workouts" ON public.workouts FOR SELECT TO authenticated USING (public.can_access_plan(plan_id));
CREATE POLICY "Trainer manages workouts" ON public.workouts FOR ALL TO authenticated
  USING (public.is_plan_trainer(plan_id)) WITH CHECK (public.is_plan_trainer(plan_id));

-- workout_exercises
CREATE POLICY "Involved view exercises" ON public.workout_exercises FOR SELECT TO authenticated USING (public.can_access_workout(workout_id));
CREATE POLICY "Trainer manages exercises" ON public.workout_exercises FOR ALL TO authenticated
  USING (public.is_workout_trainer(workout_id)) WITH CHECK (public.is_workout_trainer(workout_id));

-- workout_executions
CREATE POLICY "Involved view executions" ON public.workout_executions FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR public.is_workout_trainer(workout_id));
CREATE POLICY "Student manages executions" ON public.workout_executions FOR ALL TO authenticated
  USING (student_id = public.current_student_id())
  WITH CHECK (student_id = public.current_student_id() AND public.can_access_workout(workout_id));

-- exercise_logs
CREATE POLICY "Involved view exercise logs" ON public.exercise_logs FOR SELECT TO authenticated USING (public.can_access_execution(execution_id));
CREATE POLICY "Student manages exercise logs" ON public.exercise_logs FOR ALL TO authenticated
  USING (public.owns_execution(execution_id)) WITH CHECK (public.owns_execution(execution_id));

-- set_logs
CREATE POLICY "Involved view set logs" ON public.set_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercise_logs el WHERE el.id = exercise_log_id AND public.can_access_execution(el.execution_id)));
CREATE POLICY "Student manages set logs" ON public.set_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercise_logs el WHERE el.id = exercise_log_id AND public.owns_execution(el.execution_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercise_logs el WHERE el.id = exercise_log_id AND public.owns_execution(el.execution_id)));

-- body weight
CREATE POLICY "Student manages weight entries" ON public.body_weight_entries FOR ALL TO authenticated
  USING (student_id = public.current_student_id()) WITH CHECK (student_id = public.current_student_id());
CREATE POLICY "Linked trainer reads weight entries" ON public.body_weight_entries FOR SELECT TO authenticated
  USING (public.is_linked_trainer_of_student(student_id));
CREATE POLICY "Student manages weight goal" ON public.body_weight_goals FOR ALL TO authenticated
  USING (student_id = public.current_student_id()) WITH CHECK (student_id = public.current_student_id());
CREATE POLICY "Linked trainer reads weight goal" ON public.body_weight_goals FOR SELECT TO authenticated
  USING (public.is_linked_trainer_of_student(student_id));

-- updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trainer_profiles_updated BEFORE UPDATE ON public.trainer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_student_profiles_updated BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workouts_updated BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.user_role;
  _profile_id uuid;
BEGIN
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'student')::public.user_role;

  INSERT INTO public.profiles (user_id, role, full_name, email, phone)
  VALUES (
    NEW.id, _role,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  RETURNING id INTO _profile_id;

  IF _role = 'trainer' THEN
    INSERT INTO public.trainer_profiles (profile_id) VALUES (_profile_id);
  ELSE
    INSERT INTO public.student_profiles (profile_id) VALUES (_profile_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;