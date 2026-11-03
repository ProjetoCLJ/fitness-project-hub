-- 0010 · Gamificação: execuções com cronômetro, XP (livro), Foco, metas, marcos, medalhas e treinos planejados.
-- Tudo é calculado no servidor (gatilhos + gm_process), então o cliente não consegue fraudar XP nem Foco.

-- ---------- Execuções com cronômetro ----------
ALTER TABLE public.workout_executions
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS is_valid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS slot_id uuid;
ALTER TABLE public.workout_executions DROP CONSTRAINT IF EXISTS workout_executions_source_check;
ALTER TABLE public.workout_executions ADD CONSTRAINT workout_executions_source_check CHECK (source IN ('online','offline'));
CREATE UNIQUE INDEX IF NOT EXISTS workout_executions_dedupe
  ON public.workout_executions (student_id, workout_id, started_at) WHERE is_valid;

-- ---------- Tabelas ----------
CREATE TABLE IF NOT EXISTS public.planned_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  workout_name text NOT NULL,
  planned_date date NOT NULL,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','missed')),
  execution_id uuid REFERENCES public.workout_executions(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  UNIQUE (workout_id, planned_date)
);
CREATE INDEX IF NOT EXISTS planned_slots_student_week ON public.planned_slots (student_id, week_start);

CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport text,
  kind text NOT NULL CHECK (kind IN ('workout','week_bonus','foco_goal','foco_marco')),
  amount integer NOT NULL CHECK (amount >= 0),
  league_xp integer NOT NULL DEFAULT 0,
  ref_key text NOT NULL UNIQUE,
  occurred_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_events_user_day ON public.xp_events (user_id, occurred_on);

CREATE TABLE IF NOT EXISTS public.gm_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_since date NOT NULL DEFAULT public.today_brt(),
  processed_on date,
  anchor_menu integer NOT NULL DEFAULT 0 CHECK (anchor_menu BETWEEN 0 AND 5),
  faults integer NOT NULL DEFAULT 0,
  max_faults integer NOT NULL DEFAULT 0,
  max_clock_drop integer NOT NULL DEFAULT 0,
  idle_days integer NOT NULL DEFAULT 0,
  foco_started_on date,
  foco_restart_gap integer NOT NULL DEFAULT 0,
  last_workout_on date,
  perfect_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.foco_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu integer NOT NULL,
  days integer NOT NULL,
  xp integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','conquered','abandoned')),
  chosen_on date NOT NULL DEFAULT public.today_brt(),
  ended_on date
);
CREATE UNIQUE INDEX IF NOT EXISTS foco_goals_one_active ON public.foco_goals (user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.foco_marcos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days integer NOT NULL,
  achieved_on date NOT NULL,
  PRIMARY KEY (user_id, days)
);

CREATE TABLE IF NOT EXISTS public.user_medals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medal_key text NOT NULL,
  achieved_on date NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  seen_at timestamptz,
  PRIMARY KEY (user_id, medal_key)
);

GRANT SELECT ON public.planned_slots, public.xp_events, public.gm_state, public.foco_goals, public.foco_marcos, public.user_medals TO authenticated;
GRANT ALL ON public.planned_slots, public.xp_events, public.gm_state, public.foco_goals, public.foco_marcos, public.user_medals TO service_role;
ALTER TABLE public.planned_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foco_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foco_marcos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_medals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own slots" ON public.planned_slots FOR SELECT TO authenticated USING (student_id = public.current_student_id());
CREATE POLICY "Own xp" ON public.xp_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own gm state" ON public.gm_state FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own goals" ON public.foco_goals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own marcos" ON public.foco_marcos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own medals" ON public.user_medals FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---------- Regras de Foco ----------
-- Descida de menu por faltas acumuladas: 1ª falta -1, depois -1 a cada 2 faltas (1,3,5,7...).
CREATE OR REPLACE FUNCTION public.foco_drop_faults(n integer) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN n <= 0 THEN 0 ELSE 1 + (n - 1) / 2 END $$;

CREATE OR REPLACE FUNCTION public.foco_offered_menu(s public.gm_state) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(0, s.anchor_menu - GREATEST(public.foco_drop_faults(s.max_faults), s.max_clock_drop))
$$;

-- Metas do menu (dias, XP). Só aparecem metas maiores do que os dias atuais de Foco.
CREATE OR REPLACE FUNCTION public.foco_options(p_menu integer, p_current integer) RETURNS TABLE(days integer, xp integer)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  d integer[]; x integer[]; i integer; found_any boolean := false;
BEGIN
  CASE p_menu
    WHEN 0 THEN d := ARRAY[3,5,7];        x := ARRAY[8,14,20];
    WHEN 1 THEN d := ARRAY[10,14,21];     x := ARRAY[25,35,50];
    WHEN 2 THEN d := ARRAY[30,45,60];     x := ARRAY[55,75,100];
    WHEN 3 THEN d := ARRAY[90,120,150];   x := ARRAY[150,190,240];
    WHEN 4 THEN d := ARRAY[180,240,300];  x := ARRAY[300,390,480];
    ELSE        d := ARRAY[365,450,550];  x := ARRAY[600,720,880];
  END CASE;
  FOR i IN 1..3 LOOP
    IF d[i] > p_current THEN
      days := d[i]; xp := x[i]; found_any := true; RETURN NEXT;
    END IF;
  END LOOP;
  IF NOT found_any THEN  -- além do último marco: +100/+200/+300 dias
    FOR i IN 1..3 LOOP
      days := p_current + 100 * i; xp := round(days * 1.6)::integer; RETURN NEXT;
    END LOOP;
  END IF;
END $$;

-- ---------- Medalhas e XP ----------
CREATE OR REPLACE FUNCTION public.award_medal(p_user uuid, p_key text, p_meta jsonb, p_on date) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_medals (user_id, medal_key, achieved_on, meta) VALUES (p_user, p_key, p_on, COALESCE(p_meta, '{}'::jsonb))
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user, 'medal', 'Nova conquista desbloqueada!', 'Veja em Perfil › Conquistas.', '/dashboard/student/profile?tab=conquistas');
  RETURN true;
END $$;

-- Placeholders substituídos pelo arquivo 0011 (ligas).
CREATE OR REPLACE FUNCTION public.league_ensure_member(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN NULL; END $$;
CREATE OR REPLACE FUNCTION public.league_run() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN NULL; END $$;

CREATE OR REPLACE FUNCTION public.award_xp(p_user uuid, p_sport text, p_kind text, p_amount integer, p_league integer, p_key text, p_on date)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t integer; _total integer; _sport_total integer;
BEGIN
  INSERT INTO public.xp_events (user_id, sport, kind, amount, league_xp, ref_key, occurred_on)
  VALUES (p_user, p_sport, p_kind, p_amount, p_league, p_key, p_on)
  ON CONFLICT (ref_key) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT COALESCE(sum(amount), 0) INTO _total FROM public.xp_events WHERE user_id = p_user;
  FOREACH t IN ARRAY ARRAY[100,500,1000,2500,5000,10000,25000,50000] LOOP
    IF _total >= t THEN PERFORM public.award_medal(p_user, 'xp_' || t, jsonb_build_object('xp', t), p_on); END IF;
  END LOOP;
  IF p_sport IS NOT NULL THEN
    SELECT COALESCE(sum(amount), 0) INTO _sport_total FROM public.xp_events WHERE user_id = p_user AND sport = p_sport;
    FOREACH t IN ARRAY ARRAY[500,2000,5000] LOOP
      IF _sport_total >= t THEN PERFORM public.award_medal(p_user, 'xp_esporte_' || p_sport || '_' || t, jsonb_build_object('sport', p_sport, 'xp', t), p_on); END IF;
    END LOOP;
  END IF;
  IF p_league > 0 THEN PERFORM public.league_ensure_member(p_user); END IF;
  RETURN true;
END $$;

-- ---------- Treinos planejados (slots) ----------
CREATE OR REPLACE FUNCTION public.materialize_slots(p_student uuid, p_from date, p_to date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; _since date;
BEGIN
  SELECT g.tracking_since INTO _since
  FROM public.gm_state g JOIN public.profiles p ON p.user_id = g.user_id
  JOIN public.student_profiles sp ON sp.profile_id = p.id WHERE sp.id = p_student;
  IF _since IS NOT NULL THEN p_from := GREATEST(p_from, _since); END IF;
  IF p_from > p_to THEN RETURN 0; END IF;

  INSERT INTO public.planned_slots (student_id, plan_id, workout_id, workout_name, planned_date, week_start)
  SELECT p.student_id, p.id, w.id, w.name, days.d, public.monday_of(days.d)
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
    AND ((p.cycle_weeks IS NULL AND w.workout_date = days.d)
      OR (p.cycle_weeks IS NOT NULL AND w.weekday = extract(dow FROM days.d)::int
          AND w.week_index = (((public.monday_of(days.d) - public.monday_of(p.start_date)) / 7) % p.cycle_weeks)))
  ON CONFLICT (workout_id, planned_date) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ---------- Execução: validação (antes) e pontuação (depois) ----------
CREATE OR REPLACE FUNCTION public.prepare_execution() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _now timestamptz := public.gm_now(); _dur integer; _sport text;
BEGIN
  IF NEW.finished_at IS NULL OR NEW.finished_at > _now + interval '5 minutes' THEN NEW.finished_at := _now; END IF;
  IF NEW.started_at IS NULL OR NEW.started_at > NEW.finished_at THEN NEW.started_at := NEW.finished_at; END IF;
  _dur := LEAST(240, GREATEST(0, floor(extract(epoch FROM (NEW.finished_at - NEW.started_at)) / 60)::integer));
  NEW.duration_minutes := _dur;
  NEW.date := (NEW.finished_at AT TIME ZONE 'America/Sao_Paulo')::date;
  SELECT sport INTO _sport FROM public.plans WHERE id = NEW.plan_id;
  NEW.sport := _sport;
  NEW.is_valid := NEW.plan_id IS NOT NULL AND NEW.workout_id IS NOT NULL AND _sport IS NOT NULL
                  AND _dur >= 25 AND NEW.finished_at >= _now - interval '24 hours';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_a_prepare_execution ON public.workout_executions;
CREATE TRIGGER trg_a_prepare_execution BEFORE INSERT ON public.workout_executions
  FOR EACH ROW EXECUTE FUNCTION public.prepare_execution();

CREATE OR REPLACE FUNCTION public.process_execution() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid; prior integer; xp integer; cnt integer; t integer; v_slot uuid; n_sports integer;
BEGIN
  IF NOT NEW.is_valid THEN RETURN NEW; END IF;
  SELECT p.user_id INTO v_user FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id WHERE sp.id = NEW.student_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.gm_state (user_id, tracking_since) VALUES (v_user, NEW.date) ON CONFLICT DO NOTHING;

  SELECT count(*) INTO prior FROM public.workout_executions
   WHERE student_id = NEW.student_id AND is_valid AND date = NEW.date AND id <> NEW.id;
  xp := CASE WHEN prior <= 1 THEN 20 WHEN prior = 2 THEN 15 WHEN prior = 3 THEN 10 WHEN prior = 4 THEN 5 ELSE 0 END;
  IF xp > 0 THEN PERFORM public.award_xp(v_user, NEW.sport, 'workout', xp, xp, 'workout:' || NEW.id, NEW.date); END IF;

  -- Marca o treino planejado da semana como feito (adiantar já garante; recuperar vale até domingo).
  PERFORM public.materialize_slots(NEW.student_id, public.monday_of(NEW.date), public.monday_of(NEW.date) + 6);
  SELECT id INTO v_slot FROM public.planned_slots
   WHERE student_id = NEW.student_id AND workout_id = NEW.workout_id
     AND week_start = public.monday_of(NEW.date) AND status = 'pending'
   ORDER BY abs(planned_date - NEW.date), planned_date LIMIT 1;
  IF v_slot IS NOT NULL THEN
    UPDATE public.planned_slots SET status = 'done', execution_id = NEW.id, resolved_at = public.gm_now() WHERE id = v_slot;
    UPDATE public.workout_executions SET slot_id = v_slot WHERE id = NEW.id;
  END IF;

  -- Medalhas de treinos e de esportes.
  SELECT count(*) INTO cnt FROM public.workout_executions WHERE student_id = NEW.student_id AND is_valid;
  FOREACH t IN ARRAY ARRAY[1,10,50,100,250,500,1000] LOOP
    IF cnt >= t THEN PERFORM public.award_medal(v_user, 'treinos_' || t, jsonb_build_object('treinos', t), NEW.date); END IF;
  END LOOP;
  PERFORM public.award_medal(v_user, 'primeiro_' || NEW.sport, jsonb_build_object('sport', NEW.sport), NEW.date);
  SELECT count(DISTINCT sport) INTO n_sports FROM public.workout_executions
   WHERE student_id = NEW.student_id AND is_valid AND date_trunc('month', date) = date_trunc('month', NEW.date);
  IF n_sports >= 3 THEN PERFORM public.award_medal(v_user, 'multi_3', '{}'::jsonb, NEW.date); END IF;
  IF n_sports >= 5 THEN PERFORM public.award_medal(v_user, 'multi_5', '{}'::jsonb, NEW.date); END IF;

  PERFORM public.gm_process(v_user);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_b_process_execution ON public.workout_executions;
CREATE TRIGGER trg_b_process_execution AFTER INSERT ON public.workout_executions
  FOR EACH ROW EXECUTE FUNCTION public.process_execution();

-- ---------- Motor do Foco (dia a dia, idempotente) ----------
CREATE OR REPLACE FUNCTION public.gm_process(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.gm_state%ROWTYPE;
  g public.foco_goals%ROWTYPE;
  sid uuid;
  today date := public.today_brt();
  d date; d0 date; first_exec date;
  has_workout boolean; v_days integer; i integer; cd integer;
  wk date; missed integer; total integer;
  marcos integer[] := ARRAY[14,30,60,90,120,180,365,730];
  marco_xp integer[] := ARRAY[15,30,45,55,70,100,200,500];
  streaks integer[] := ARRAY[4,12,26];
  n integer;
BEGIN
  SELECT sp.id INTO sid FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id WHERE p.user_id = p_user;
  IF sid IS NULL THEN RETURN; END IF;
  INSERT INTO public.gm_state (user_id) VALUES (p_user) ON CONFLICT DO NOTHING;
  SELECT * INTO s FROM public.gm_state WHERE user_id = p_user FOR UPDATE;

  IF s.processed_on IS NULL THEN
    SELECT min(date) INTO first_exec FROM public.workout_executions WHERE student_id = sid AND is_valid;
    d0 := COALESCE(first_exec, today);
  ELSE
    d0 := s.processed_on + 1;
  END IF;
  IF d0 > today THEN d0 := today; END IF;

  d := d0;
  WHILE d <= today LOOP
    IF d = d0 OR extract(isodow FROM d) = 1 THEN
      PERFORM public.materialize_slots(sid, public.monday_of(d), public.monday_of(d) + 6);
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.workout_executions WHERE student_id = sid AND is_valid AND date = d) INTO has_workout;
    IF has_workout THEN
      IF s.foco_started_on IS NULL THEN
        s.foco_started_on := d;
        s.foco_restart_gap := CASE WHEN s.last_workout_on IS NULL THEN 0 ELSE d - s.last_workout_on END;
      END IF;
      s.last_workout_on := d;
      s.idle_days := 0;
    END IF;

    -- Marcos automáticos e meta pessoal (contam o dia de hoje).
    IF s.foco_started_on IS NOT NULL THEN
      v_days := d - s.foco_started_on + 1;
      FOR i IN 1..array_length(marcos, 1) LOOP
        IF v_days >= marcos[i] THEN
          INSERT INTO public.foco_marcos (user_id, days, achieved_on) VALUES (p_user, marcos[i], d) ON CONFLICT DO NOTHING;
          IF FOUND THEN
            PERFORM public.award_xp(p_user, NULL, 'foco_marco', marco_xp[i], 0, 'marco:' || p_user || ':' || marcos[i], d);
            PERFORM public.award_medal(p_user, 'foco_' || marcos[i], jsonb_build_object('days', marcos[i]), d);
          END IF;
        END IF;
      END LOOP;

      SELECT * INTO g FROM public.foco_goals WHERE user_id = p_user AND status = 'active';
      IF FOUND AND v_days >= g.days THEN
        UPDATE public.foco_goals SET status = 'conquered', ended_on = d WHERE id = g.id;
        PERFORM public.award_xp(p_user, NULL, 'foco_goal', g.xp, 0, 'goal:' || g.id, d);
        IF g.days >= 30 THEN PERFORM public.award_medal(p_user, 'meta_foco_' || g.days, jsonb_build_object('days', g.days), d); END IF;
        IF s.foco_restart_gap >= 14 THEN PERFORM public.award_medal(p_user, 'volta_ao_foco', '{}'::jsonb, d); END IF;
        s.anchor_menu := LEAST(5, g.menu + 1);
        s.faults := 0; s.max_faults := 0; s.max_clock_drop := 0;
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (p_user, 'foco', 'Meta conquistada!', g.days || ' dias de Foco. Escolha a próxima meta.', '/dashboard/student');
      END IF;
    END IF;

    -- Fechamento do dia (só dias que já terminaram).
    IF d < today THEN
      IF NOT has_workout THEN
        IF EXISTS (SELECT 1 FROM public.planned_slots WHERE student_id = sid AND week_start = public.monday_of(d)) THEN
          s.idle_days := 0;
        ELSE
          s.idle_days := s.idle_days + 1;
        END IF;
      END IF;
      IF s.idle_days >= 8 AND s.foco_started_on IS NOT NULL THEN
        UPDATE public.foco_goals SET status = 'abandoned', ended_on = d WHERE user_id = p_user AND status = 'active';
        s.foco_started_on := NULL;
      END IF;
      IF s.idle_days >= 7 THEN
        cd := 1 + (s.idle_days - 7) / 3;
        s.max_clock_drop := GREATEST(s.max_clock_drop, cd);
      END IF;

      IF extract(isodow FROM d) = 7 THEN  -- domingo: fecha a semana
        wk := public.monday_of(d);
        UPDATE public.planned_slots SET status = 'missed', resolved_at = public.gm_now()
         WHERE student_id = sid AND week_start = wk AND status = 'pending';
        GET DIAGNOSTICS missed = ROW_COUNT;
        SELECT count(*) INTO total FROM public.planned_slots WHERE student_id = sid AND week_start = wk;
        IF missed > 0 THEN
          s.faults := s.faults + missed;
          s.max_faults := GREATEST(s.max_faults, s.faults);
          s.perfect_streak := 0;
          IF s.foco_started_on IS NOT NULL THEN
            UPDATE public.foco_goals SET status = 'abandoned', ended_on = d WHERE user_id = p_user AND status = 'active';
            s.foco_started_on := NULL;
          END IF;
        ELSIF total > 0 THEN
          PERFORM public.award_xp(p_user, NULL, 'week_bonus', 10, 10, 'weekbonus:' || p_user || ':' || wk, d);
          s.faults := GREATEST(s.faults - 1, 0);
          s.perfect_streak := s.perfect_streak + 1;
          PERFORM public.award_medal(p_user, 'semana_1', '{}'::jsonb, d);
          FOREACH n IN ARRAY streaks LOOP
            IF s.perfect_streak >= n THEN PERFORM public.award_medal(p_user, 'semanas_' || n, jsonb_build_object('semanas', n), d); END IF;
          END LOOP;
        END IF;
      END IF;
      s.processed_on := d;
    END IF;
    d := d + 1;
  END LOOP;

  UPDATE public.gm_state SET
    processed_on = s.processed_on, anchor_menu = s.anchor_menu, faults = s.faults, max_faults = s.max_faults,
    max_clock_drop = s.max_clock_drop, idle_days = s.idle_days, foco_started_on = s.foco_started_on,
    foco_restart_gap = s.foco_restart_gap, last_workout_on = s.last_workout_on, perfect_streak = s.perfect_streak
  WHERE user_id = p_user;
END $$;

-- ---------- RPCs do app ----------
CREATE OR REPLACE FUNCTION public.gm_sync_me() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  PERFORM public.gm_process(auth.uid());
  PERFORM public.league_run();
END $$;

CREATE OR REPLACE FUNCTION public.choose_foco_goal(p_days integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.gm_state%ROWTYPE; _me uuid := auth.uid(); m integer; cur integer; x integer;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  PERFORM public.gm_process(_me);
  SELECT * INTO s FROM public.gm_state WHERE user_id = _me;
  IF EXISTS (SELECT 1 FROM public.foco_goals WHERE user_id = _me AND status = 'active') THEN RAISE EXCEPTION 'GOAL_ALREADY_ACTIVE'; END IF;
  m := public.foco_offered_menu(s);
  cur := CASE WHEN s.foco_started_on IS NULL THEN 0 ELSE public.today_brt() - s.foco_started_on + 1 END;
  SELECT o.xp INTO x FROM public.foco_options(m, cur) o WHERE o.days = p_days;
  IF x IS NULL THEN RAISE EXCEPTION 'INVALID_GOAL'; END IF;
  INSERT INTO public.foco_goals (user_id, menu, days, xp) VALUES (_me, m, p_days, x);
END $$;

CREATE OR REPLACE FUNCTION public.mark_medals_seen() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_medals SET seen_at = now() WHERE user_id = auth.uid() AND seen_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.gm_overview() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid(); s public.gm_state%ROWTYPE; sid uuid; today date := public.today_brt();
  wk date := public.monday_of(public.today_brt()); cur integer; m integer; g public.foco_goals%ROWTYPE;
  _month date := date_trunc('month', public.today_brt())::date;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  PERFORM public.gm_process(_me);
  PERFORM public.league_run();
  SELECT * INTO s FROM public.gm_state WHERE user_id = _me;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  SELECT id INTO sid FROM public.student_profiles WHERE id = public.current_student_id();
  cur := CASE WHEN s.foco_started_on IS NULL THEN 0 ELSE today - s.foco_started_on + 1 END;
  m := public.foco_offered_menu(s);
  SELECT * INTO g FROM public.foco_goals WHERE user_id = _me AND status = 'active';

  RETURN jsonb_build_object(
    'xp_total', (SELECT COALESCE(sum(amount), 0) FROM public.xp_events WHERE user_id = _me),
    'xp_month', (SELECT COALESCE(sum(league_xp), 0) FROM public.xp_events WHERE user_id = _me AND occurred_on >= _month),
    'xp_by_sport', (SELECT COALESCE(jsonb_agg(jsonb_build_object('sport', sport, 'xp', xp) ORDER BY xp DESC), '[]'::jsonb)
                    FROM (SELECT sport, sum(amount)::int AS xp FROM public.xp_events WHERE user_id = _me AND sport IS NOT NULL GROUP BY sport) t),
    'workouts_total', (SELECT count(*) FROM public.workout_executions WHERE student_id = sid AND is_valid),
    'unseen_medals', (SELECT count(*) FROM public.user_medals WHERE user_id = _me AND seen_at IS NULL),
    'foco', jsonb_build_object(
      'active', s.foco_started_on IS NOT NULL,
      'days', cur,
      'started_on', s.foco_started_on,
      'last_workout_on', s.last_workout_on,
      'faults', s.faults,
      'idle_days', s.idle_days,
      'perfect_streak', s.perfect_streak,
      'offered_menu', m,
      'goal', CASE WHEN g.id IS NULL THEN NULL ELSE jsonb_build_object('id', g.id, 'days', g.days, 'xp', g.xp, 'menu', g.menu) END,
      'options', (SELECT COALESCE(jsonb_agg(jsonb_build_object('days', o.days, 'xp', o.xp) ORDER BY o.days), '[]'::jsonb) FROM public.foco_options(m, cur) o),
      'goal_status', CASE WHEN g.id IS NOT NULL THEN 'active'
                          WHEN EXISTS (SELECT 1 FROM public.foco_goals WHERE user_id = _me AND status = 'conquered'
                                         AND ended_on = (SELECT max(ended_on) FROM public.foco_goals WHERE user_id = _me AND status <> 'active')) THEN 'conquered'
                          WHEN EXISTS (SELECT 1 FROM public.foco_goals WHERE user_id = _me AND status = 'abandoned') THEN 'broken'
                          ELSE 'first' END
    ),
    'week', jsonb_build_object(
      'start', wk,
      'planned', (SELECT count(*) FROM public.planned_slots WHERE student_id = sid AND week_start = wk),
      'done', (SELECT count(*) FROM public.planned_slots WHERE student_id = sid AND week_start = wk AND status = 'done'),
      'late', (SELECT count(*) FROM public.planned_slots WHERE student_id = sid AND week_start = wk AND status = 'pending' AND planned_date < today)
    )
  );
END $$;

-- Execução interna só pelo servidor.
REVOKE EXECUTE ON FUNCTION public.award_medal(uuid, text, jsonb, date), public.award_xp(uuid, text, text, integer, integer, text, date),
  public.materialize_slots(uuid, date, date), public.gm_process(uuid), public.process_execution(), public.prepare_execution(),
  public.league_ensure_member(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gm_sync_me(), public.choose_foco_goal(integer), public.mark_medals_seen(), public.gm_overview() TO authenticated;