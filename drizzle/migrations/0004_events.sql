-- 0004: Eventos (criados por professores), notificações e convite de alunos (eventos e desafios).
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name text NOT NULL DEFAULT '',
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  description text,
  location text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  max_participants integer CHECK (max_participants IS NULL OR max_participants > 0),
  cover_path text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  invite_code text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  invite_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX events_starts_idx ON public.events (starts_at);
CREATE INDEX events_creator_idx ON public.events (creator_id);

CREATE TABLE public.event_participants (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE public.event_invites (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events, public.event_participants, public.event_invites, public.notifications TO authenticated;
GRANT ALL ON public.events, public.event_participants, public.event_invites, public.notifications TO service_role;

CREATE OR REPLACE FUNCTION public.is_trainer_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'trainer');
$$;

CREATE OR REPLACE FUNCTION public.is_event_creator(_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND creator_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_participants WHERE event_id = _event_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_event_invited(_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_invites WHERE event_id = _event_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.set_event_creator_name() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT full_name INTO NEW.creator_name FROM public.profiles WHERE user_id = NEW.creator_id LIMIT 1;
  NEW.creator_name := COALESCE(NEW.creator_name, '');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_events_creator_name BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_event_creator_name();

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_event_participants_author_name BEFORE INSERT ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_challenge_author_name();

CREATE OR REPLACE FUNCTION public.notify_event_changes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'event_cancelled', 'Evento cancelado', NEW.title, '/eventos/' || NEW.id
    FROM public.event_participants WHERE event_id = NEW.id;
  ELSIF ROW(NEW.starts_at, NEW.ends_at, NEW.location, NEW.city, NEW.state)
        IS DISTINCT FROM ROW(OLD.starts_at, OLD.ends_at, OLD.location, OLD.city, OLD.state) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'event_updated', 'Evento atualizado', NEW.title, '/eventos/' || NEW.id
    FROM public.event_participants WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_events_notify AFTER UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_changes();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read visible events" ON public.events FOR SELECT TO authenticated
  USING (visibility = 'public' OR creator_id = auth.uid() OR public.is_event_participant(id) OR public.is_event_invited(id));
CREATE POLICY "Trainers create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND public.is_trainer_user());
CREATE POLICY "Creator updates event" ON public.events FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creator deletes event" ON public.events FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Own or creator reads participants" ON public.event_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_event_creator(event_id));
CREATE POLICY "Leave own registration" ON public.event_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Own or creator reads invites" ON public.event_invites FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_event_creator(event_id));

CREATE POLICY "Own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_event_preview(p_code text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events;
BEGIN
  SELECT * INTO e FROM public.events WHERE invite_code = p_code AND (visibility = 'public' OR invite_active);
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description, 'location', e.location, 'state', e.state, 'city', e.city,
    'visibility', e.visibility, 'starts_at', e.starts_at, 'ends_at', e.ends_at, 'max_participants', e.max_participants,
    'status', e.status, 'creator_name', e.creator_name,
    'participant_count', (SELECT count(*) FROM public.event_participants WHERE event_id = e.id),
    'is_member', EXISTS (SELECT 1 FROM public.event_participants WHERE event_id = e.id AND user_id = auth.uid())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_event(p_event_id uuid, p_code text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO e FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_ACCESS'; END IF;
  IF e.creator_id = auth.uid() THEN RAISE EXCEPTION 'IS_CREATOR'; END IF;
  IF NOT (e.visibility = 'public'
          OR (p_code IS NOT NULL AND p_code = e.invite_code AND e.invite_active)
          OR public.is_event_invited(e.id)) THEN
    RAISE EXCEPTION 'NO_ACCESS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.event_participants WHERE event_id = e.id AND user_id = auth.uid()) THEN RETURN e.id; END IF;
  IF e.status = 'cancelled' THEN RAISE EXCEPTION 'EVENT_CANCELLED'; END IF;
  IF COALESCE(e.ends_at, e.starts_at) < now() THEN RAISE EXCEPTION 'EVENT_ENDED'; END IF;
  SELECT count(*) INTO v_count FROM public.event_participants WHERE event_id = e.id;
  IF e.max_participants IS NOT NULL AND v_count >= e.max_participants THEN RAISE EXCEPTION 'EVENT_FULL'; END IF;
  INSERT INTO public.event_participants (event_id, user_id) VALUES (e.id, auth.uid());
  RETURN e.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_counts(p_event_ids uuid[])
RETURNS TABLE (event_id uuid, participant_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, count(ep.user_id)
  FROM public.events e
  LEFT JOIN public.event_participants ep ON ep.event_id = e.id
  WHERE e.id = ANY (p_event_ids)
    AND (e.visibility = 'public' OR e.creator_id = auth.uid() OR public.is_event_participant(e.id) OR public.is_event_invited(e.id))
  GROUP BY e.id;
$$;

CREATE OR REPLACE FUNCTION public.invite_students_to_event(p_event_id uuid, p_student_ids uuid[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events; sid uuid; v_user uuid; v_count integer := 0; v_rows integer;
BEGIN
  SELECT * INTO e FROM public.events WHERE id = p_event_id AND creator_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  FOREACH sid IN ARRAY p_student_ids LOOP
    IF NOT public.is_linked_trainer_of_student(sid) THEN CONTINUE; END IF;
    SELECT p.user_id INTO v_user FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id WHERE sp.id = sid;
    IF v_user IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.event_invites (event_id, user_id, invited_by) VALUES (e.id, v_user, auth.uid()) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_user, 'event_invite', 'Convite para evento', e.title, '/eventos/' || e.id);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_students_to_challenge(p_challenge_id uuid, p_student_ids uuid[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.challenges; sid uuid; v_user uuid; v_count integer := 0;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = p_challenge_id AND creator_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF NOT c.invite_active OR c.status <> 'active' THEN RAISE EXCEPTION 'INVITE_DISABLED'; END IF;
  FOREACH sid IN ARRAY p_student_ids LOOP
    IF NOT public.is_linked_trainer_of_student(sid) THEN CONTINUE; END IF;
    SELECT p.user_id INTO v_user FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id WHERE sp.id = sid;
    IF v_user IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = c.id AND user_id = v_user) THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (v_user, 'challenge_invite', 'Convite para desafio', c.title, '/desafio/' || c.invite_code);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_students_to_event(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_students_to_challenge(uuid, uuid[]) TO authenticated;

CREATE POLICY "Authenticated read event covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-covers');
CREATE POLICY "Trainers upload own event covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers' AND public.is_trainer_user() AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Delete own event covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);