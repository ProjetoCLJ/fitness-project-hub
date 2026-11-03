-- 0009 · Modo atleta: todo usuário (inclusive profissional) é também aluno; planos próprios; esporte do plano;
-- remoção de treinos/planos só vale a partir da próxima segunda; pausa de plano.

-- ---------- Datas (horário de Brasília) ----------
-- gm_now()/today_brt() aceitam override por app.now (usado só em testes; clientes não conseguem definir GUCs).
CREATE OR REPLACE FUNCTION public.gm_now() RETURNS timestamptz
LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('app.now', true), '')::timestamptz, now()) $$;

CREATE OR REPLACE FUNCTION public.today_brt() RETURNS date
LANGUAGE sql STABLE AS $$ SELECT (public.gm_now() AT TIME ZONE 'America/Sao_Paulo')::date $$;

CREATE OR REPLACE FUNCTION public.monday_of(d date) RETURNS date
LANGUAGE sql IMMUTABLE AS $$ SELECT d - (extract(isodow FROM d)::int - 1) $$;

-- Próxima segunda-feira estritamente depois de hoje.
CREATE OR REPLACE FUNCTION public.next_monday_brt() RETURNS date
LANGUAGE sql STABLE AS $$ SELECT public.monday_of(public.today_brt()) + 7 $$;

-- ---------- Todo mundo tem registro de aluno ----------
INSERT INTO public.student_profiles (profile_id)
SELECT p.id FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.profile_id = p.id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.user_role; _profile_id uuid; _student_id uuid;
BEGIN
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'student')::public.user_role;
  INSERT INTO public.profiles (user_id, role, full_name, email, phone)
  VALUES (NEW.id, _role, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1)), NEW.email, NEW.raw_user_meta_data->>'phone')
  RETURNING id INTO _profile_id;
  IF _role = 'trainer' THEN
    INSERT INTO public.trainer_profiles (profile_id) VALUES (_profile_id);
  END IF;
  INSERT INTO public.student_profiles (profile_id) VALUES (_profile_id) RETURNING id INTO _student_id;
  INSERT INTO public.trainer_clients (trainer_id, student_id, status)
    SELECT i.trainer_id, _student_id, 'active' FROM public.student_invites i
    WHERE lower(i.email) = lower(NEW.email) AND i.status = 'pending' AND i.student_id IS NULL
  ON CONFLICT (trainer_id, student_id) DO NOTHING;
  UPDATE public.student_invites SET student_id = _student_id, status = 'accepted', responded_at = now()
    WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND student_id IS NULL;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Profissional também pode ser aluno de outro profissional (nunca de si mesmo).
CREATE OR REPLACE FUNCTION public.invite_student(p_email text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _trainer uuid := public.current_trainer_id();
  _email text := lower(trim(p_email));
  _profile public.profiles%ROWTYPE;
  _student uuid;
BEGIN
  IF _trainer IS NULL THEN RAISE EXCEPTION 'NOT_TRAINER'; END IF;
  IF _email = '' OR position('@' in _email) = 0 THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE lower(email) = _email;
  IF FOUND THEN
    IF _profile.user_id = auth.uid() THEN RAISE EXCEPTION 'SELF_INVITE'; END IF;
    SELECT id INTO _student FROM public.student_profiles WHERE profile_id = _profile.id;
    IF EXISTS (SELECT 1 FROM public.trainer_clients WHERE trainer_id = _trainer AND student_id = _student AND status = 'active') THEN
      RAISE EXCEPTION 'ALREADY_LINKED';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.student_invites WHERE trainer_id = _trainer AND lower(email) = _email AND status = 'pending') THEN
    RAISE EXCEPTION 'ALREADY_INVITED';
  END IF;
  INSERT INTO public.student_invites (trainer_id, student_id, email) VALUES (_trainer, _student, _email);
  RETURN jsonb_build_object('registered', _student IS NOT NULL);
END $$;

-- Ninguém é o próprio profissional.
CREATE OR REPLACE FUNCTION public.is_same_person(_trainer_id uuid, _student_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_profiles tp
    JOIN public.student_profiles sp ON sp.profile_id = tp.profile_id
    WHERE tp.id = _trainer_id AND sp.id = _student_id)
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_training() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.trainer_id IS NOT NULL AND public.is_same_person(NEW.trainer_id, NEW.student_id) THEN
    RAISE EXCEPTION 'SELF_TRAINING_NOT_ALLOWED';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_clients_no_self ON public.trainer_clients;
CREATE TRIGGER trg_clients_no_self BEFORE INSERT OR UPDATE ON public.trainer_clients
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_training();
DROP TRIGGER IF EXISTS trg_plans_no_self ON public.plans;
CREATE TRIGGER trg_plans_no_self BEFORE INSERT OR UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_training();

-- ---------- Planos próprios, esporte e remoção ----------
ALTER TABLE public.plans ALTER COLUMN trainer_id DROP NOT NULL;
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS removed_at date;
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_sport_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_sport_check CHECK (sport IN (
  'musculacao','funcional_hiit','calistenia','corrida','caminhada','ciclismo','natacao','yoga','pilates',
  'lutas','coletivos_raquete','danca','alongamento','outro'));
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS removed_at date;

CREATE OR REPLACE FUNCTION public.is_own_plan(_plan_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.plans WHERE id = _plan_id AND trainer_id IS NULL AND student_id = public.current_student_id())
$$;

DROP POLICY IF EXISTS "Athlete manages own plans" ON public.plans;
CREATE POLICY "Athlete manages own plans" ON public.plans FOR ALL TO authenticated
  USING (student_id = public.current_student_id() AND trainer_id IS NULL)
  WITH CHECK (student_id = public.current_student_id() AND trainer_id IS NULL);
DROP POLICY IF EXISTS "Athlete manages own workouts" ON public.workouts;
CREATE POLICY "Athlete manages own workouts" ON public.workouts FOR ALL TO authenticated
  USING (public.is_own_plan(plan_id)) WITH CHECK (public.is_own_plan(plan_id));
DROP POLICY IF EXISTS "Athlete manages own exercises" ON public.workout_exercises;
CREATE POLICY "Athlete manages own exercises" ON public.workout_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND public.is_own_plan(w.plan_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND public.is_own_plan(w.plan_id)));

-- Quem pode mexer no plano: o profissional que o criou ou o próprio atleta (plano próprio).
CREATE OR REPLACE FUNCTION public.can_manage_plan(_plan_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.plans p WHERE p.id = _plan_id
    AND ((p.trainer_id IS NOT NULL AND p.trainer_id = public.current_trainer_id())
      OR (p.trainer_id IS NULL AND p.student_id = public.current_student_id())))
$$;

-- Remover/encerrar plano ou treino só vale a partir da próxima segunda: o atleta continua devendo a semana atual.
CREATE OR REPLACE FUNCTION public.remove_plan(p_plan_id uuid, p_status text DEFAULT 'cancelled') RETURNS date
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eff date := public.next_monday_brt();
BEGIN
  IF p_status NOT IN ('cancelled','completed') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF NOT public.can_manage_plan(p_plan_id) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  UPDATE public.plans
     SET status = p_status::public.plan_status, removed_at = _eff, end_date = _eff - 1
   WHERE id = p_plan_id AND removed_at IS NULL;
  RETURN _eff;
END $$;

CREATE OR REPLACE FUNCTION public.remove_workout(p_workout_id uuid) RETURNS date
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eff date := public.next_monday_brt(); _plan uuid;
BEGIN
  SELECT plan_id INTO _plan FROM public.workouts WHERE id = p_workout_id;
  IF _plan IS NULL OR NOT public.can_manage_plan(_plan) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  UPDATE public.workouts SET removed_at = _eff WHERE id = p_workout_id AND removed_at IS NULL;
  RETURN _eff;
END $$;

-- Pausa: vale a partir da próxima segunda. Retomar vale na hora (tem que voltar a cumprir os treinos).
CREATE TABLE IF NOT EXISTS public.plan_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  starts_on date NOT NULL,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE UNIQUE INDEX IF NOT EXISTS plan_pauses_open_unique ON public.plan_pauses (plan_id) WHERE ends_on IS NULL;
GRANT SELECT ON public.plan_pauses TO authenticated;
GRANT ALL ON public.plan_pauses TO service_role;
ALTER TABLE public.plan_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athlete reads own pauses" ON public.plan_pauses FOR SELECT TO authenticated
  USING (student_id = public.current_student_id());

CREATE OR REPLACE FUNCTION public.pause_plan(p_plan_id uuid) RETURNS date
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eff date := public.next_monday_brt(); _student uuid := public.current_student_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE id = p_plan_id AND student_id = _student AND removed_at IS NULL) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.plan_pauses WHERE plan_id = p_plan_id AND ends_on IS NULL) THEN
    RAISE EXCEPTION 'ALREADY_PAUSED';
  END IF;
  INSERT INTO public.plan_pauses (plan_id, student_id, starts_on) VALUES (p_plan_id, _student, _eff);
  RETURN _eff;
END $$;

CREATE OR REPLACE FUNCTION public.resume_plan(p_plan_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _student uuid := public.current_student_id(); _p public.plan_pauses%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.plan_pauses WHERE plan_id = p_plan_id AND student_id = _student AND ends_on IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  IF _p.starts_on > public.today_brt() THEN
    DELETE FROM public.plan_pauses WHERE id = _p.id;  -- a pausa ainda nem começou
  ELSE
    UPDATE public.plan_pauses SET ends_on = public.today_brt() - 1 WHERE id = _p.id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.remove_plan(uuid, text), public.remove_workout(uuid),
  public.pause_plan(uuid), public.resume_plan(uuid) TO authenticated;