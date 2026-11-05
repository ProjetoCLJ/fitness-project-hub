-- 0015 · Treinos acompanhados pelo professor e horário do treino.
-- O professor define, no plano, quais treinos do ciclo ele acompanha e a hora; o aluno pode ajustar um treino da
-- semana ("só desta vez"); cada treino concluído guarda se foi acompanhado ou não.

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS accompanied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.planned_slots
  ADD COLUMN IF NOT EXISTS accompanied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS overridden boolean NOT NULL DEFAULT false;
ALTER TABLE public.workout_executions
  ADD COLUMN IF NOT EXISTS accompanied boolean;

-- Só plano com profissional pode ter treino acompanhado (plano próprio do atleta, não).
CREATE OR REPLACE FUNCTION public.workout_accompany_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.accompanied AND NOT EXISTS (SELECT 1 FROM public.plans WHERE id = NEW.plan_id AND trainer_id IS NOT NULL) THEN
    NEW.accompanied := false;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_workouts_accompany_guard ON public.workouts;
CREATE TRIGGER trg_workouts_accompany_guard BEFORE INSERT OR UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.workout_accompany_guard();

-- Mudança no plano vale para os treinos ainda pendentes da semana que o aluno não ajustou.
CREATE OR REPLACE FUNCTION public.workout_propagate_options() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.planned_slots
     SET accompanied = NEW.accompanied, start_time = NEW.start_time
   WHERE workout_id = NEW.id AND status = 'pending' AND planned_date >= public.today_brt() AND NOT overridden;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_workouts_propagate_options ON public.workouts;
CREATE TRIGGER trg_workouts_propagate_options AFTER UPDATE OF accompanied, start_time ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.workout_propagate_options();

-- Os treinos planejados da semana nascem com os campos do plano.
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
    AND ((p.cycle_weeks IS NULL AND w.workout_date = days.d)
      OR (p.cycle_weeks IS NOT NULL AND w.weekday = extract(dow FROM days.d)::int
          AND w.week_index = (((public.monday_of(days.d) - public.monday_of(p.start_date)) / 7) % p.cycle_weeks)))
  ON CONFLICT (workout_id, planned_date) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- O aluno ajusta um treino da semana ("só desta vez"): acompanhado ou não e/ou o horário.
CREATE OR REPLACE FUNCTION public.set_slot_options(p_slot_id uuid, p_accompanied boolean, p_start_time time) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.planned_slots s
     SET accompanied = p_accompanied AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = s.plan_id AND p.trainer_id IS NOT NULL),
         start_time = p_start_time,
         overridden = true
   WHERE s.id = p_slot_id AND s.student_id = public.current_student_id() AND s.status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.set_slot_options(uuid, boolean, time) TO authenticated;

-- Treino concluído: guarda se foi acompanhado (vem do que o aluno confirmou ou, na falta, do treino do plano).
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
  IF NEW.accompanied IS NULL THEN
    SELECT w.accompanied INTO NEW.accompanied FROM public.workouts w WHERE w.id = NEW.workout_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE id = NEW.plan_id AND trainer_id IS NOT NULL) THEN NEW.accompanied := false; END IF;
  NEW.accompanied := COALESCE(NEW.accompanied, false);
  RETURN NEW;
END $$;

-- Painel de adesão: separa o que foi planejado e feito com acompanhamento.
CREATE OR REPLACE FUNCTION public.trainer_adherence() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _t uuid := public.current_trainer_id();
  wk date := public.monday_of(public.today_brt());
  today date := public.today_brt();
BEGIN
  IF _t IS NULL THEN RAISE EXCEPTION 'NOT_TRAINER'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_data ORDER BY (row_data->>'name'))
    FROM (
      SELECT jsonb_build_object(
        'student_id', tc.student_id,
        'name', pr.full_name,
        'tracking', gs.user_id IS NOT NULL,
        'foco_days', CASE WHEN gs.foco_started_on IS NULL THEN 0 ELSE today - gs.foco_started_on + 1 END,
        'has_plan', EXISTS (SELECT 1 FROM public.plans p WHERE p.student_id = tc.student_id AND p.trainer_id = _t AND p.status = 'active'),
        'week_planned', (SELECT count(*) FROM public.planned_slots s JOIN public.plans p ON p.id = s.plan_id
                          WHERE s.student_id = tc.student_id AND p.trainer_id = _t AND s.week_start = wk),
        'week_done', (SELECT count(*) FROM public.planned_slots s JOIN public.plans p ON p.id = s.plan_id
                       WHERE s.student_id = tc.student_id AND p.trainer_id = _t AND s.week_start = wk AND s.status = 'done'),
        'week_late', (SELECT count(*) FROM public.planned_slots s JOIN public.plans p ON p.id = s.plan_id
                       WHERE s.student_id = tc.student_id AND p.trainer_id = _t AND s.week_start = wk
                         AND s.status = 'pending' AND s.planned_date < today),
        'week_accompanied', (SELECT count(*) FROM public.planned_slots s JOIN public.plans p ON p.id = s.plan_id
                              WHERE s.student_id = tc.student_id AND p.trainer_id = _t AND s.week_start = wk AND s.accompanied),
        'week_accompanied_done', (SELECT count(*) FROM public.planned_slots s JOIN public.plans p ON p.id = s.plan_id
                                   WHERE s.student_id = tc.student_id AND p.trainer_id = _t AND s.week_start = wk AND s.accompanied AND s.status = 'done')
      ) AS row_data
      FROM public.trainer_clients tc
      JOIN public.student_profiles sp ON sp.id = tc.student_id
      JOIN public.profiles pr ON pr.id = sp.profile_id
      LEFT JOIN public.gm_state gs ON gs.user_id = pr.user_id
      WHERE tc.trainer_id = _t AND tc.status = 'active'
    ) t
  ), '[]'::jsonb);
END $$;

REVOKE EXECUTE ON FUNCTION public.materialize_slots(uuid, date, date), public.prepare_execution(), public.workout_propagate_options() FROM PUBLIC, anon, authenticated;
