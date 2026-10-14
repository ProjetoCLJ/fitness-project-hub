DROP POLICY IF EXISTS "Challenge photos are public" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_read_challenge_photo(_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (storage.foldername(_name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.challenge_posts p
        WHERE p.photo_url = _name AND public.is_challenge_member(p.challenge_id)
      );
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_challenge_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_challenge_photo(text) TO authenticated, service_role;

CREATE POLICY "Challenge members read photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'challenge-photos' AND public.can_read_challenge_photo(name));