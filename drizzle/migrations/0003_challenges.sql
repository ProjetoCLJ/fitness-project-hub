CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  description text,
  rules text,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  invite_code text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  invite_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE public.challenge_participants (
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE public.challenge_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  description text,
  activity_at timestamptz NOT NULL DEFAULT now(),
  photo_url text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'platform')),
  workout_execution_id uuid REFERENCES public.workout_executions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenge_posts_challenge_idx ON public.challenge_posts (challenge_id, activity_at DESC);
CREATE UNIQUE INDEX challenge_posts_execution_uniq ON public.challenge_posts (challenge_id, workout_execution_id) WHERE workout_execution_id IS NOT NULL;

CREATE TABLE public.challenge_reactions (
  post_id uuid NOT NULL REFERENCES public.challenge_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, emoji)
);

CREATE TABLE public.challenge_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.challenge_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  content text NOT NULL CHECK (char_length(btrim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenge_comments_post_idx ON public.challenge_comments (post_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges, public.challenge_participants, public.challenge_posts, public.challenge_reactions, public.challenge_comments TO authenticated;
GRANT ALL ON public.challenges, public.challenge_participants, public.challenge_posts, public.challenge_reactions, public.challenge_comments TO service_role;

CREATE OR REPLACE FUNCTION public.is_challenge_member(_challenge_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = _challenge_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_challenge_creator(_challenge_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.challenges WHERE id = _challenge_id AND creator_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.challenge_is_open(_challenge_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.challenges WHERE id = _challenge_id AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.post_challenge_id(_post_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT challenge_id FROM public.challenge_posts WHERE id = _post_id;
$$;

CREATE OR REPLACE FUNCTION public.set_challenge_author_name() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT full_name INTO NEW.author_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  NEW.author_name := COALESCE(NEW.author_name, '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_participants_author_name BEFORE INSERT ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_challenge_author_name();
CREATE TRIGGER trg_posts_author_name BEFORE INSERT ON public.challenge_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_challenge_author_name();
CREATE TRIGGER trg_comments_author_name BEFORE INSERT ON public.challenge_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_challenge_author_name();

CREATE TRIGGER trg_challenges_updated_at BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_challenge_posts_updated_at BEFORE UPDATE ON public.challenge_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.add_challenge_creator() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.challenge_participants (challenge_id, user_id) VALUES (NEW.id, NEW.creator_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_challenges_add_creator AFTER INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.add_challenge_creator();

CREATE OR REPLACE FUNCTION public.post_execution_to_challenges() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  SELECT p.user_id INTO v_user
  FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id
  WHERE sp.id = NEW.student_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.challenge_posts (challenge_id, user_id, title, description, activity_at, source, workout_execution_id)
  SELECT c.id, v_user, COALESCE(NEW.workout_name, 'Treino'), 'Treino concluído na plataforma.', now(), 'platform', NEW.id
  FROM public.challenges c
  JOIN public.challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = v_user
  WHERE c.status = 'active' AND (c.end_date IS NULL OR c.end_date >= current_date)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_execution_to_challenges AFTER INSERT ON public.workout_executions
  FOR EACH ROW EXECUTE FUNCTION public.post_execution_to_challenges();

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read challenge" ON public.challenges FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR public.is_challenge_member(id));
CREATE POLICY "Anyone creates own challenge" ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creator updates challenge" ON public.challenges FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creator deletes challenge" ON public.challenges FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Members read participants" ON public.challenge_participants FOR SELECT TO authenticated
  USING (public.is_challenge_member(challenge_id));
CREATE POLICY "Leave or creator removes" ON public.challenge_participants FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND NOT public.is_challenge_creator(challenge_id)) OR (public.is_challenge_creator(challenge_id) AND user_id <> auth.uid()));

CREATE POLICY "Members read posts" ON public.challenge_posts FOR SELECT TO authenticated
  USING (public.is_challenge_member(challenge_id));
CREATE POLICY "Members create manual posts" ON public.challenge_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND source = 'manual' AND workout_execution_id IS NULL
              AND public.is_challenge_member(challenge_id) AND public.challenge_is_open(challenge_id));
CREATE POLICY "Author edits own manual post" ON public.challenge_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND source = 'manual') WITH CHECK (user_id = auth.uid() AND source = 'manual');
CREATE POLICY "Author or creator deletes post" ON public.challenge_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_challenge_creator(challenge_id));

CREATE POLICY "Members read reactions" ON public.challenge_reactions FOR SELECT TO authenticated
  USING (public.is_challenge_member(public.post_challenge_id(post_id)));
CREATE POLICY "Members react" ON public.challenge_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_challenge_member(public.post_challenge_id(post_id)));
CREATE POLICY "Remove own reaction" ON public.challenge_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members read comments" ON public.challenge_comments FOR SELECT TO authenticated
  USING (public.is_challenge_member(public.post_challenge_id(post_id)));
CREATE POLICY "Members comment" ON public.challenge_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_challenge_member(public.post_challenge_id(post_id)));
CREATE POLICY "Author or creator deletes comment" ON public.challenge_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_challenge_creator(public.post_challenge_id(post_id)));

CREATE OR REPLACE FUNCTION public.get_challenge_preview(p_code text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.challenges; v_creator text; v_count integer;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE invite_code = p_code AND invite_active AND status = 'active';
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT full_name INTO v_creator FROM public.profiles WHERE user_id = c.creator_id LIMIT 1;
  SELECT count(*) INTO v_count FROM public.challenge_participants WHERE challenge_id = c.id;
  RETURN jsonb_build_object(
    'title', c.title, 'description', c.description, 'start_date', c.start_date, 'end_date', c.end_date,
    'creator_name', v_creator, 'participant_count', v_count,
    'is_member', EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = c.id AND user_id = auth.uid())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_challenge(p_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT id INTO v_id FROM public.challenges WHERE invite_code = p_code AND invite_active AND status = 'active';
  IF v_id IS NULL THEN RAISE EXCEPTION 'Convite inválido ou desativado'; END IF;
  INSERT INTO public.challenge_participants (challenge_id, user_id) VALUES (v_id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_challenge_ranking(p_challenge_id uuid)
RETURNS TABLE (user_id uuid, author_name text, points bigint, last_activity timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_challenge_member(p_challenge_id) THEN RAISE EXCEPTION 'Sem acesso ao desafio'; END IF;
  RETURN QUERY
  SELECT cp.user_id, cp.author_name, count(po.id)::bigint AS points, max(po.activity_at) AS last_activity
  FROM public.challenge_participants cp
  LEFT JOIN public.challenge_posts po ON po.challenge_id = cp.challenge_id AND po.user_id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id
  GROUP BY cp.user_id, cp.author_name
  ORDER BY points DESC, last_activity ASC NULLS LAST, cp.author_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_challenge_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_challenge(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_ranking(uuid) TO authenticated;

CREATE POLICY "Challenge photos are public" ON storage.objects FOR SELECT
  USING (bucket_id = 'challenge-photos');
CREATE POLICY "Upload own challenge photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'challenge-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Delete own challenge photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'challenge-photos' AND (storage.foldername(name))[1] = auth.uid()::text);