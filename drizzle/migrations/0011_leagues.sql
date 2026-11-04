-- 0011 · Ligas mensais: grupos de ~15, ranking por XP da liga, promoção/rebaixamento, ranking por esporte e privacidade.
-- O fechamento do mês é "preguiçoso": qualquer chamada do app dispara league_run() (idempotente, com trava), sem precisar de cron.

CREATE TABLE IF NOT EXISTS public.league_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  league integer NOT NULL DEFAULT 1 CHECK (league BETWEEN 1 AND 10),
  joined_month date NOT NULL,
  podium_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.league_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  league integer NOT NULL CHECK (league BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS league_groups_month ON public.league_groups (month, league);

CREATE TABLE IF NOT EXISTS public.league_group_members (
  group_id uuid NOT NULL REFERENCES public.league_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  ref_xp numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (month, user_id)
);
CREATE INDEX IF NOT EXISTS league_group_members_group ON public.league_group_members (group_id);

CREATE TABLE IF NOT EXISTS public.league_results (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  league integer NOT NULL,
  position integer,
  group_size integer,
  xp integer NOT NULL DEFAULT 0,
  outcome text NOT NULL CHECK (outcome IN ('promoted','stayed','relegated','inactive')),
  new_league integer NOT NULL,
  PRIMARY KEY (user_id, month)
);

CREATE TABLE IF NOT EXISTS public.league_closures (
  month date PRIMARY KEY,
  closed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gm_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ranking_public boolean NOT NULL DEFAULT false
);

GRANT SELECT ON public.league_state, public.league_results, public.gm_settings TO authenticated;
GRANT ALL ON public.league_state, public.league_groups, public.league_group_members, public.league_results, public.league_closures, public.gm_settings TO service_role;
ALTER TABLE public.league_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own league state" ON public.league_state FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own league results" ON public.league_results FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own settings" ON public.gm_settings FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---------- Regras ----------
CREATE OR REPLACE FUNCTION public.league_month_xp(p_user uuid, p_month date) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(league_xp), 0)::int FROM public.xp_events
  WHERE user_id = p_user AND occurred_on >= p_month AND occurred_on < (p_month + interval '1 month')::date
$$;

-- Quantos sobem/descem em um grupo de n pessoas na liga p_league (tabela definida para 15, proporcional nos demais).
CREATE OR REPLACE FUNCTION public.league_zone_counts(p_league integer, p_n integer) RETURNS TABLE(up integer, down integer)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  ups integer[] := ARRAY[6,5,5,5,4,4,3,3,3,0];
  downs integer[] := ARRAY[0,2,3,3,3,3,3,4,4,4];
  u integer; d integer;
BEGIN
  IF p_n < 8 THEN  -- grupo aberto: pódio sobe, ninguém é rebaixado pelo ranking
    u := CASE WHEN p_league = 10 THEN 0 ELSE LEAST(3, p_n) END; d := 0;
  ELSE
    u := ups[p_league]; d := downs[p_league];
    IF u > 0 THEN
      u := round(u::numeric / 15 * p_n)::int;
      u := CASE WHEN p_n >= 10 THEN GREATEST(3, u) ELSE GREATEST(2, u) END;
    END IF;
    d := round(d::numeric / 15 * p_n)::int;
    IF u + d > p_n THEN d := p_n - u; END IF;
  END IF;
  up := u; down := d; RETURN NEXT;
END $$;

-- ---------- Entrada nas ligas ----------
CREATE OR REPLACE FUNCTION public.league_ensure_member(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _month date := date_trunc('month', public.today_brt())::date; _league integer; _gid uuid;
BEGIN
  PERFORM public.league_run();
  INSERT INTO public.league_state (user_id, joined_month) VALUES (p_user, _month) ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.league_group_members WHERE month = _month AND user_id = p_user) THEN RETURN; END IF;
  SELECT league INTO _league FROM public.league_state WHERE user_id = p_user;
  -- Quem chega no meio do mês entra no grupo da liga que ainda tem vaga (enche até 15), ou abre um novo.
  SELECT g.id INTO _gid
  FROM public.league_groups g
  LEFT JOIN public.league_group_members m ON m.group_id = g.id
  WHERE g.month = _month AND g.league = _league
  GROUP BY g.id HAVING count(m.user_id) < 15
  ORDER BY count(m.user_id) DESC, g.created_at LIMIT 1;
  IF _gid IS NULL THEN
    INSERT INTO public.league_groups (month, league) VALUES (_month, _league) RETURNING id INTO _gid;
  END IF;
  INSERT INTO public.league_group_members (group_id, user_id, month, ref_xp) VALUES (_gid, p_user, _month, 0);
END $$;

-- ---------- Montagem dos grupos de um mês ----------
CREATE OR REPLACE FUNCTION public.league_form_groups(p_month date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _prev date := (p_month - interval '1 month')::date;
  _prev2 date := (p_month - interval '2 month')::date;
  _l integer; n integer; g integer; i integer; gids uuid[]; gid uuid;
BEGIN
  FOR _l IN 1..10 LOOP
    CREATE TEMP TABLE IF NOT EXISTS _cand (user_id uuid, ref numeric, xp_prev integer) ON COMMIT DROP;
    TRUNCATE _cand;
    INSERT INTO _cand
    SELECT x.user_id,
           CASE WHEN x.first_month >= _prev THEN x.xp1::numeric ELSE 0.6 * x.xp1 + 0.4 * x.xp2 END,
           x.xp1
    FROM (
      SELECT ls.user_id,
             public.league_month_xp(ls.user_id, _prev) AS xp1,
             public.league_month_xp(ls.user_id, _prev2) AS xp2,
             (SELECT date_trunc('month', min(e.occurred_on))::date FROM public.xp_events e WHERE e.user_id = ls.user_id AND e.league_xp > 0) AS first_month
      FROM public.league_state ls
      WHERE ls.league = _l
        AND NOT EXISTS (SELECT 1 FROM public.league_group_members m WHERE m.month = p_month AND m.user_id = ls.user_id)
    ) x
    WHERE x.xp1 > 0;

    SELECT count(*) INTO n FROM _cand;
    IF n = 0 THEN CONTINUE; END IF;
    IF n < 8 THEN
      g := 1;
    ELSE
      g := GREATEST(1, round(n / 15.0)::int);
      IF n::numeric / g > 20 THEN g := g + 1; END IF;
      IF g > 1 AND n::numeric / g < 10 THEN g := g - 1; END IF;
    END IF;

    gids := ARRAY[]::uuid[];
    FOR i IN 1..g LOOP
      INSERT INTO public.league_groups (month, league) VALUES (p_month, _l) RETURNING id INTO gid;
      gids := gids || gid;
    END LOOP;
    -- Fatias consecutivas de XP de referência: o grupo 1 reúne os maiores.
    INSERT INTO public.league_group_members (group_id, user_id, month, ref_xp)
    SELECT gids[t.bucket], t.user_id, p_month, t.ref
    FROM (SELECT c.user_id, c.ref, ntile(g) OVER (ORDER BY c.ref DESC, c.xp_prev DESC, c.user_id) AS bucket FROM _cand c) t;
  END LOOP;
END $$;

-- ---------- Fechamento de um mês ----------
CREATE OR REPLACE FUNCTION public.league_close_month(p_month date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _end date := (p_month + interval '1 month')::date;
  names text[] := ARRAY['Estreante','Amador','Praticante','Competidor','Atleta','Veterano','Mestre','Campeão','Elite','Lenda'];
  grp record; mem record; _up integer; _down integer; _promoted boolean; _relegated boolean; _exempt boolean;
  _new integer; _outcome text; _sid uuid; _streak integer; n integer;
BEGIN
  FOR grp IN SELECT id, league FROM public.league_groups WHERE month = p_month LOOP
    SELECT count(*) INTO n FROM public.league_group_members WHERE group_id = grp.id;
    SELECT z.up, z.down INTO _up, _down FROM public.league_zone_counts(grp.league, n) z;

    FOR mem IN
      SELECT m.user_id,
             public.league_month_xp(m.user_id, p_month) AS xp,
             row_number() OVER (ORDER BY public.league_month_xp(m.user_id, p_month) DESC,
                                (SELECT count(*) FROM public.workout_executions we JOIN public.student_profiles sp ON sp.id = we.student_id
                                   JOIN public.profiles pr ON pr.id = sp.profile_id
                                  WHERE pr.user_id = m.user_id AND we.is_valid AND we.date >= p_month AND we.date < _end) DESC,
                                (SELECT COALESCE(max(e.created_at), 'infinity') FROM public.xp_events e
                                  WHERE e.user_id = m.user_id AND e.league_xp > 0 AND e.occurred_on >= p_month AND e.occurred_on < _end) ASC,
                                (SELECT CASE WHEN gs.foco_started_on IS NULL THEN 0 ELSE GREATEST(0, LEAST(public.today_brt(), _end - 1) - gs.foco_started_on + 1) END
                                   FROM public.gm_state gs WHERE gs.user_id = m.user_id) DESC NULLS LAST,
                                m.user_id) AS pos
      FROM public.league_group_members m WHERE m.group_id = grp.id
      ORDER BY 3
    LOOP
      SELECT sp.id INTO _sid FROM public.student_profiles sp JOIN public.profiles pr ON pr.id = sp.profile_id WHERE pr.user_id = mem.user_id;
      _exempt := NOT EXISTS (SELECT 1 FROM public.planned_slots ps WHERE ps.student_id = _sid AND ps.planned_date >= p_month AND ps.planned_date < _end);
      _promoted := grp.league < 10 AND mem.xp > 0 AND mem.pos <= _up;
      _relegated := grp.league > 1 AND NOT _promoted AND NOT _exempt AND (mem.xp = 0 OR (_down > 0 AND mem.pos > n - _down));
      _new := grp.league + CASE WHEN _promoted THEN 1 WHEN _relegated THEN -1 ELSE 0 END;
      _outcome := CASE WHEN _promoted THEN 'promoted' WHEN _relegated THEN 'relegated' ELSE 'stayed' END;

      INSERT INTO public.league_results (user_id, month, league, position, group_size, xp, outcome, new_league)
      VALUES (mem.user_id, p_month, grp.league, mem.pos, n, mem.xp, _outcome, _new) ON CONFLICT DO NOTHING;
      UPDATE public.league_state SET league = _new WHERE user_id = mem.user_id;

      -- Pódio (1º a 3º lugar com XP) e sequência de pódios.
      IF mem.pos <= 3 AND mem.xp > 0 THEN
        PERFORM public.award_medal(mem.user_id, 'podio_' || to_char(p_month, 'YYYY_MM'),
                                   jsonb_build_object('position', mem.pos, 'league', grp.league, 'month', to_char(p_month, 'YYYY-MM')), _end - 1);
        UPDATE public.league_state SET podium_streak = podium_streak + 1 WHERE user_id = mem.user_id RETURNING podium_streak INTO _streak;
        IF _streak >= 3 THEN PERFORM public.award_medal(mem.user_id, 'podio_seq_3', '{}'::jsonb, _end - 1); END IF;
        IF _streak >= 5 THEN PERFORM public.award_medal(mem.user_id, 'podio_seq_5', '{}'::jsonb, _end - 1); END IF;
        IF _streak >= 10 THEN PERFORM public.award_medal(mem.user_id, 'podio_seq_10', '{}'::jsonb, _end - 1); END IF;
        IF grp.league = 10 AND mem.pos = 1 THEN PERFORM public.award_medal(mem.user_id, 'campeao_lenda', '{}'::jsonb, _end - 1); END IF;
      ELSE
        UPDATE public.league_state SET podium_streak = 0 WHERE user_id = mem.user_id;
      END IF;

      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (mem.user_id, 'league',
        CASE _outcome WHEN 'promoted' THEN 'Você subiu de liga!' WHEN 'relegated' THEN 'Resultado da liga' ELSE 'Resultado da liga' END,
        'Você terminou em ' || mem.pos || 'º lugar na liga ' || names[grp.league] || ' e agora está na liga ' || names[_new] || '.',
        '/dashboard/student/leagues');
    END LOOP;
  END LOOP;

  -- Quem ficou fora dos grupos (XP zero) cai 1 liga por mês, exceto quem não tinha treino planejado no mês.
  FOR mem IN
    SELECT ls.user_id, ls.league FROM public.league_state ls
    WHERE NOT EXISTS (SELECT 1 FROM public.league_group_members m WHERE m.month = p_month AND m.user_id = ls.user_id)
      AND ls.joined_month < p_month
  LOOP
    SELECT sp.id INTO _sid FROM public.student_profiles sp JOIN public.profiles pr ON pr.id = sp.profile_id WHERE pr.user_id = mem.user_id;
    _exempt := NOT EXISTS (SELECT 1 FROM public.planned_slots ps WHERE ps.student_id = _sid AND ps.planned_date >= p_month AND ps.planned_date < _end);
    _new := CASE WHEN mem.league > 1 AND NOT _exempt THEN mem.league - 1 ELSE mem.league END;
    INSERT INTO public.league_results (user_id, month, league, xp, outcome, new_league)
    VALUES (mem.user_id, p_month, mem.league, 0, 'inactive', _new) ON CONFLICT DO NOTHING;
    UPDATE public.league_state SET league = _new, podium_streak = 0 WHERE user_id = mem.user_id;
  END LOOP;
END $$;

-- Dispara o que estiver pendente: fecha meses passados (em ordem) e monta os grupos do mês seguinte.
CREATE OR REPLACE FUNCTION public.league_run() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur date := date_trunc('month', public.today_brt())::date; m date;
BEGIN
  SELECT COALESCE((SELECT (max(month) + interval '1 month')::date FROM public.league_closures),
                  (SELECT min(month) FROM public.league_groups)) INTO m;
  IF m IS NULL OR m >= cur THEN RETURN; END IF;

  PERFORM pg_advisory_xact_lock(7771001);
  LOOP
    SELECT COALESCE((SELECT (max(month) + interval '1 month')::date FROM public.league_closures),
                    (SELECT min(month) FROM public.league_groups)) INTO m;
    EXIT WHEN m IS NULL OR m >= cur;
    PERFORM public.league_close_month(m);
    INSERT INTO public.league_closures (month) VALUES (m);
    PERFORM public.league_form_groups((m + interval '1 month')::date);
  END LOOP;
END $$;

-- ---------- Telas ----------
CREATE OR REPLACE FUNCTION public.league_overview() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid(); _month date := date_trunc('month', public.today_brt())::date;
  _end date := (date_trunc('month', public.today_brt()) + interval '1 month')::date;
  _state public.league_state%ROWTYPE; _gid uuid; _n integer; _up integer; _down integer;
  _members jsonb; _myxp integer; _mypos integer; _thr_up integer; _thr_safe integer; _last jsonb;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  PERFORM public.league_run();
  SELECT * INTO _state FROM public.league_state WHERE user_id = _me;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('joined', false, 'league', 1, 'days_left', _end - public.today_brt(), 'month', _month);
  END IF;
  SELECT group_id INTO _gid FROM public.league_group_members WHERE month = _month AND user_id = _me;
  SELECT jsonb_build_object('month', r.month, 'league', r.league, 'position', r.position, 'outcome', r.outcome, 'new_league', r.new_league, 'xp', r.xp)
    INTO _last FROM public.league_results r WHERE r.user_id = _me ORDER BY r.month DESC LIMIT 1;

  IF _gid IS NULL THEN
    RETURN jsonb_build_object('joined', true, 'in_group', false, 'league', _state.league, 'days_left', _end - public.today_brt(),
                              'month', _month, 'last_result', _last);
  END IF;

  SELECT count(*) INTO _n FROM public.league_group_members WHERE group_id = _gid;
  SELECT z.up, z.down INTO _up, _down FROM public.league_zone_counts(_state.league, _n) z;

  WITH ranked AS (
    SELECT m.user_id, public.league_month_xp(m.user_id, _month) AS xp,
           row_number() OVER (ORDER BY public.league_month_xp(m.user_id, _month) DESC,
              (SELECT COALESCE(max(e.created_at), 'infinity') FROM public.xp_events e WHERE e.user_id = m.user_id AND e.league_xp > 0 AND e.occurred_on >= _month) ASC,
              m.user_id) AS pos
    FROM public.league_group_members m WHERE m.group_id = _gid
  )
  SELECT jsonb_agg(jsonb_build_object(
           'position', r.pos, 'xp', r.xp, 'is_me', r.user_id = _me,
           'name', regexp_replace(split_part(p.full_name, ' ', 1) || CASE WHEN position(' ' in trim(p.full_name)) > 0
                    THEN ' ' || left(split_part(trim(p.full_name), ' ', array_length(string_to_array(trim(p.full_name), ' '), 1)), 1) || '.' ELSE '' END, '\s+', ' ', 'g'),
           'avatar', p.profile_image_url,
           'zone', CASE WHEN _state.league < 10 AND r.xp > 0 AND r.pos <= _up THEN 'up'
                        WHEN _state.league > 1 AND _down > 0 AND r.pos > _n - _down AND NOT (r.xp > 0 AND r.pos <= _up) THEN 'down'
                        ELSE 'stay' END
         ) ORDER BY r.pos),
         max(r.xp) FILTER (WHERE r.user_id = _me), max(r.pos) FILTER (WHERE r.user_id = _me),
         max(r.xp) FILTER (WHERE r.pos = _up), max(r.xp) FILTER (WHERE r.pos = _n - _down)
  INTO _members, _myxp, _mypos, _thr_up, _thr_safe
  FROM ranked r JOIN public.profiles p ON p.user_id = r.user_id;

  RETURN jsonb_build_object(
    'joined', true, 'in_group', true, 'league', _state.league, 'month', _month, 'days_left', _end - public.today_brt(),
    'group_size', _n, 'is_open', _n < 8, 'up_slots', _up, 'down_slots', _down,
    'my_position', _mypos, 'my_xp', _myxp,
    'xp_to_promotion', CASE WHEN _state.league < 10 AND _up > 0 AND _mypos > _up THEN GREATEST(1, COALESCE(_thr_up, 0) - _myxp + 1) END,
    'xp_to_safety', CASE WHEN _state.league > 1 AND _down > 0 AND _mypos > _n - _down THEN GREATEST(1, COALESCE(_thr_safe, 0) - _myxp + 1) END,
    'members', COALESCE(_members, '[]'::jsonb),
    'last_result', _last
  );
END $$;

-- Ranking por esporte (mês corrente ou geral). Só aparece quem escolheu ser público; cada um sempre vê a própria posição.
CREATE OR REPLACE FUNCTION public.sport_ranking(p_sport text, p_period text DEFAULT 'month') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _from date; _items jsonb; _mine jsonb; _public boolean;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  _from := CASE WHEN p_period = 'all' THEN date '1900-01-01' ELSE date_trunc('month', public.today_brt())::date END;
  SELECT COALESCE((SELECT ranking_public FROM public.gm_settings WHERE user_id = _me), false) INTO _public;

  WITH totals AS (
    SELECT e.user_id, sum(e.amount)::int AS xp
    FROM public.xp_events e WHERE e.sport = p_sport AND e.occurred_on >= _from GROUP BY e.user_id
  ), ranked AS (
    SELECT t.user_id, t.xp, rank() OVER (ORDER BY t.xp DESC) AS pos FROM totals t
  )
  SELECT
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('position', r.pos, 'xp', r.xp, 'is_me', r.user_id = _me,
        'name', split_part(p.full_name, ' ', 1) || CASE WHEN position(' ' in trim(p.full_name)) > 0
                THEN ' ' || left(split_part(trim(p.full_name), ' ', array_length(string_to_array(trim(p.full_name), ' '), 1)), 1) || '.' ELSE '' END,
        'avatar', p.profile_image_url) ORDER BY r.pos), '[]'::jsonb)
     FROM (SELECT * FROM ranked ORDER BY pos LIMIT 200) r
     JOIN public.profiles p ON p.user_id = r.user_id
     LEFT JOIN public.gm_settings s ON s.user_id = r.user_id
     WHERE COALESCE(s.ranking_public, false) OR r.user_id = _me),
    (SELECT jsonb_build_object('position', r.pos, 'xp', r.xp) FROM ranked r WHERE r.user_id = _me)
  INTO _items, _mine;
  RETURN jsonb_build_object('items', _items, 'me', _mine, 'public', _public);
END $$;

CREATE OR REPLACE FUNCTION public.set_ranking_public(p_public boolean) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.gm_settings (user_id, ranking_public) VALUES (auth.uid(), p_public)
  ON CONFLICT (user_id) DO UPDATE SET ranking_public = EXCLUDED.ranking_public
$$;

REVOKE EXECUTE ON FUNCTION public.league_run(), public.league_close_month(date), public.league_form_groups(date),
  public.league_ensure_member(uuid), public.league_month_xp(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_overview(), public.sport_ranking(text, text), public.set_ranking_public(boolean) TO authenticated;