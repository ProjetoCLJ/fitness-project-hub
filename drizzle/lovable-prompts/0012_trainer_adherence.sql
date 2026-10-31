-- 0012 · Painel de adesão do profissional: Foco e treinos da semana dos alunos vinculados.
-- Só considera os treinos dos planos criados por este profissional; nada dos planos próprios do aluno além dos dias de Foco.

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
                         AND s.status = 'pending' AND s.planned_date < today)
      ) AS row_data
      FROM public.trainer_clients tc
      JOIN public.student_profiles sp ON sp.id = tc.student_id
      JOIN public.profiles pr ON pr.id = sp.profile_id
      LEFT JOIN public.gm_state gs ON gs.user_id = pr.user_id
      WHERE tc.trainer_id = _t AND tc.status = 'active'
    ) t
  ), '[]'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION public.trainer_adherence() TO authenticated;
