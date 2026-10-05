ALTER TYPE public.schedule_event_type ADD VALUE IF NOT EXISTS 'expediente';
CREATE TYPE public.request_status AS ENUM ('pending','accepted','declined');

CREATE TABLE public.student_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);
CREATE UNIQUE INDEX student_invites_pending_unique ON public.student_invites (trainer_id, lower(email)) WHERE status = 'pending';

CREATE TABLE public.reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  requested_by text NOT NULL CHECK (requested_by IN ('trainer','student')),
  occurrence_date date NOT NULL,
  proposed_date date NOT NULL,
  proposed_start_time time NOT NULL,
  proposed_end_time time NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

GRANT SELECT ON public.student_invites, public.reschedule_requests TO authenticated;
GRANT ALL ON public.student_invites, public.reschedule_requests TO service_role;
ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read invites" ON public.student_invites FOR SELECT TO authenticated
  USING (trainer_id = public.current_trainer_id() OR student_id = public.current_student_id());
CREATE POLICY "Parties read reschedules" ON public.reschedule_requests FOR SELECT TO authenticated
  USING (trainer_id = public.current_trainer_id() OR student_id = public.current_student_id());

CREATE OR REPLACE FUNCTION public.trainer_has_relation_with_student(p_student_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bookings b WHERE b.student_id = p_student_id AND b.trainer_id = public.current_trainer_id())
      OR EXISTS (SELECT 1 FROM public.student_invites i WHERE i.student_id = p_student_id AND i.trainer_id = public.current_trainer_id());
$$;
CREATE OR REPLACE FUNCTION public.trainer_has_relation_with_profile(p_profile_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.trainer_has_relation_with_student((SELECT id FROM public.student_profiles WHERE profile_id = p_profile_id));
$$;
CREATE POLICY "Trainer reads profile of related students" ON public.profiles FOR SELECT TO authenticated
  USING (public.trainer_has_relation_with_profile(id));
CREATE POLICY "Trainer reads related student_profiles" ON public.student_profiles FOR SELECT TO authenticated
  USING (public.trainer_has_relation_with_student(id));

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
    IF _profile.role <> 'student' THEN RAISE EXCEPTION 'EMAIL_IS_TRAINER'; END IF;
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

CREATE OR REPLACE FUNCTION public.respond_student_invite(p_invite_id uuid, p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _student uuid := public.current_student_id(); inv public.student_invites%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.student_invites WHERE id = p_invite_id AND status = 'pending' AND student_id = _student;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITE_NOT_FOUND'; END IF;
  UPDATE public.student_invites SET status = CASE WHEN p_accept THEN 'accepted'::public.request_status ELSE 'declined'::public.request_status END, responded_at = now() WHERE id = inv.id;
  IF p_accept THEN
    INSERT INTO public.trainer_clients (trainer_id, student_id, status) VALUES (inv.trainer_id, _student, 'active')
    ON CONFLICT (trainer_id, student_id) DO UPDATE SET status = 'active';
  END IF;
END $$;

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
  ELSE
    INSERT INTO public.student_profiles (profile_id) VALUES (_profile_id) RETURNING id INTO _student_id;
    INSERT INTO public.trainer_clients (trainer_id, student_id, status)
      SELECT i.trainer_id, _student_id, 'active' FROM public.student_invites i
      WHERE lower(i.email) = lower(NEW.email) AND i.status = 'pending' AND i.student_id IS NULL
    ON CONFLICT (trainer_id, student_id) DO NOTHING;
    UPDATE public.student_invites SET student_id = _student_id, status = 'accepted', responded_at = now()
      WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND student_id IS NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_booking(p_booking_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings%ROWTYPE; _event uuid; _d date; _s time; _e time;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  _d := b.date; _s := b.start_time; _e := b.end_time;
  IF b.trainer_id = public.current_trainer_id() AND b.status = 'pending' THEN
    NULL;
  ELSIF b.student_id = public.current_student_id() AND b.status = 'suggested' THEN
    _d := b.suggested_date; _s := b.suggested_start_time; _e := b.suggested_end_time;
  ELSE
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  UPDATE public.bookings SET status = 'confirmed', date = _d, start_time = _s, end_time = _e,
    suggested_date = NULL, suggested_start_time = NULL, suggested_end_time = NULL WHERE id = b.id;
  INSERT INTO public.schedule_events (trainer_id, type, recurrence, date, start_date, end_date, start_time, end_time, booking_id)
    VALUES (b.trainer_id, 'aula', 'once', _d, _d, _d, _s, _e, b.id) RETURNING id INTO _event;
  INSERT INTO public.schedule_event_students (event_id, student_id) VALUES (_event, b.student_id);
  INSERT INTO public.trainer_clients (trainer_id, student_id, status) VALUES (b.trainer_id, b.student_id, 'active')
    ON CONFLICT (trainer_id, student_id) DO UPDATE SET status = 'active';
  RETURN _event;
END $$;

CREATE OR REPLACE FUNCTION public.request_reschedule(p_event_id uuid, p_occurrence_date date, p_date date, p_start time, p_end time) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ev public.schedule_events%ROWTYPE; _t uuid := public.current_trainer_id(); _s uuid := public.current_student_id(); st record; _count integer := 0;
BEGIN
  SELECT * INTO ev FROM public.schedule_events WHERE id = p_event_id;
  IF NOT FOUND OR ev.type <> 'aula' THEN RAISE EXCEPTION 'NOT_A_CLASS'; END IF;
  IF _t IS NOT NULL AND ev.trainer_id = _t THEN
    FOR st IN SELECT student_id FROM public.schedule_event_students WHERE event_id = ev.id LOOP
      IF EXISTS (SELECT 1 FROM public.reschedule_requests WHERE event_id = ev.id AND occurrence_date = p_occurrence_date AND student_id = st.student_id AND status = 'pending') THEN
        RAISE EXCEPTION 'ALREADY_PENDING';
      END IF;
      INSERT INTO public.reschedule_requests (event_id, trainer_id, student_id, requested_by, occurrence_date, proposed_date, proposed_start_time, proposed_end_time)
        VALUES (ev.id, ev.trainer_id, st.student_id, 'trainer', p_occurrence_date, p_date, p_start, p_end);
      _count := _count + 1;
    END LOOP;
    IF _count = 0 THEN RAISE EXCEPTION 'NO_STUDENTS'; END IF;
  ELSIF _s IS NOT NULL AND EXISTS (SELECT 1 FROM public.schedule_event_students WHERE event_id = ev.id AND student_id = _s) THEN
    IF EXISTS (SELECT 1 FROM public.reschedule_requests WHERE event_id = ev.id AND occurrence_date = p_occurrence_date AND student_id = _s AND status = 'pending') THEN
      RAISE EXCEPTION 'ALREADY_PENDING';
    END IF;
    INSERT INTO public.reschedule_requests (event_id, trainer_id, student_id, requested_by, occurrence_date, proposed_date, proposed_start_time, proposed_end_time)
      VALUES (ev.id, ev.trainer_id, _s, 'student', p_occurrence_date, p_date, p_start, p_end);
    _count := 1;
  ELSE
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  RETURN _count;
END $$;

CREATE OR REPLACE FUNCTION public.respond_reschedule(p_request_id uuid, p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reschedule_requests%ROWTYPE; ev public.schedule_events%ROWTYPE; _new uuid;
BEGIN
  SELECT * INTO r FROM public.reschedule_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
  IF NOT ((r.requested_by = 'trainer' AND r.student_id = public.current_student_id())
       OR (r.requested_by = 'student' AND r.trainer_id = public.current_trainer_id())) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  UPDATE public.reschedule_requests SET status = CASE WHEN p_accept THEN 'accepted'::public.request_status ELSE 'declined'::public.request_status END, responded_at = now() WHERE id = r.id;
  IF NOT p_accept THEN RETURN; END IF;
  SELECT * INTO ev FROM public.schedule_events WHERE id = r.event_id;
  IF ev.recurrence = 'once' THEN
    UPDATE public.schedule_events SET date = r.proposed_date, start_date = r.proposed_date, end_date = r.proposed_date,
      start_time = r.proposed_start_time, end_time = r.proposed_end_time WHERE id = ev.id;
    IF ev.booking_id IS NOT NULL THEN
      UPDATE public.bookings SET date = r.proposed_date, start_time = r.proposed_start_time, end_time = r.proposed_end_time WHERE id = ev.booking_id;
    END IF;
  ELSE
    UPDATE public.schedule_events SET excluded_dates = array_append(COALESCE(excluded_dates,'{}'), r.occurrence_date) WHERE id = ev.id;
    INSERT INTO public.schedule_events (trainer_id, type, title, recurrence, date, start_date, end_date, start_time, end_time)
      VALUES (ev.trainer_id, ev.type, ev.title, 'once', r.proposed_date, r.proposed_date, r.proposed_date, r.proposed_start_time, r.proposed_end_time) RETURNING id INTO _new;
    INSERT INTO public.schedule_event_students (event_id, student_id) SELECT _new, student_id FROM public.schedule_event_students WHERE event_id = ev.id;
  END IF;
  UPDATE public.reschedule_requests SET status = 'declined', responded_at = now()
    WHERE event_id = r.event_id AND occurrence_date = r.occurrence_date AND status = 'pending' AND id <> r.id;
END $$;

REVOKE EXECUTE ON FUNCTION public.invite_student(text), public.respond_student_invite(uuid, boolean), public.confirm_booking(uuid),
  public.request_reschedule(uuid, date, date, time, time), public.respond_reschedule(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_student(text), public.respond_student_invite(uuid, boolean), public.confirm_booking(uuid),
  public.request_reschedule(uuid, date, date, time, time), public.respond_reschedule(uuid, boolean) TO authenticated;