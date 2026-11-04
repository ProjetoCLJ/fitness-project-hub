-- 0014 · Esportes: entra CrossFit e "Esportes coletivos e de raquete" vira dois (coletivos e raquete).
-- Atualiza a lista permitida no plano e converte o código antigo (coletivos_raquete) para coletivos.

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_sport_check;

UPDATE public.plans SET sport = 'coletivos' WHERE sport = 'coletivos_raquete';
UPDATE public.workout_executions SET sport = 'coletivos' WHERE sport = 'coletivos_raquete';
UPDATE public.xp_events SET sport = 'coletivos' WHERE sport = 'coletivos_raquete';

-- Medalhas do código antigo passam para o novo (sem duplicar se a pessoa já tiver a nova).
UPDATE public.user_medals m SET medal_key = 'primeiro_coletivos', meta = jsonb_set(m.meta, '{sport}', '"coletivos"')
 WHERE m.medal_key = 'primeiro_coletivos_raquete'
   AND NOT EXISTS (SELECT 1 FROM public.user_medals x WHERE x.user_id = m.user_id AND x.medal_key = 'primeiro_coletivos');
DELETE FROM public.user_medals WHERE medal_key = 'primeiro_coletivos_raquete';

UPDATE public.user_medals m SET medal_key = replace(m.medal_key, 'xp_esporte_coletivos_raquete_', 'xp_esporte_coletivos_'),
       meta = jsonb_set(m.meta, '{sport}', '"coletivos"')
 WHERE m.medal_key LIKE 'xp_esporte_coletivos_raquete_%'
   AND NOT EXISTS (SELECT 1 FROM public.user_medals x WHERE x.user_id = m.user_id
                   AND x.medal_key = replace(m.medal_key, 'xp_esporte_coletivos_raquete_', 'xp_esporte_coletivos_'));
DELETE FROM public.user_medals WHERE medal_key LIKE 'xp_esporte_coletivos_raquete_%';

ALTER TABLE public.plans ADD CONSTRAINT plans_sport_check CHECK (sport IN (
  'musculacao','funcional_hiit','crossfit','calistenia','corrida','caminhada','ciclismo','natacao','yoga','pilates',
  'lutas','coletivos','raquete','danca','alongamento','outro'));
