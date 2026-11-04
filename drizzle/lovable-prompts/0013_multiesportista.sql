-- 0013 · Multiesportista: a partir de 3 esportes diferentes no mês, cada esporte a mais gera uma medalha nova (3, 4, 5...).
-- Só troca a função process_execution (antes premiava apenas 3 e 5 esportes). Não altera dados.

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

  -- Multiesportista: uma medalha para cada quantidade de esportes diferentes no mês, a partir de 3.
  SELECT count(DISTINCT sport) INTO n_sports FROM public.workout_executions
   WHERE student_id = NEW.student_id AND is_valid AND date_trunc('month', date) = date_trunc('month', NEW.date);
  IF n_sports >= 3 THEN
    FOR t IN 3..n_sports LOOP
      PERFORM public.award_medal(v_user, 'multi_' || t, jsonb_build_object('esportes', t), NEW.date);
    END LOOP;
  END IF;

  PERFORM public.gm_process(v_user);
  RETURN NEW;
END $$;
