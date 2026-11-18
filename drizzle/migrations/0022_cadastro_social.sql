-- 0021 · Cadastro com conta social (Google, Apple...).
-- Quem entra pela primeira vez com uma conta social nasce como aluno (padrão do gatilho handle_new_user), porque o
-- provedor não informa se a pessoa é professor. Esta função conclui o cadastro: a pessoa escolhe o tipo de uso e,
-- se for professor, informa o CREF (igual ao cadastro por e-mail). Só vale uma vez, só para contas criadas por provedor
-- social (nunca para quem entrou por e-mail e senha) e só para a própria pessoa.

CREATE OR REPLACE FUNCTION public.complete_social_signup(p_role text, p_cref text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _prov text; _done boolean; _pid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_role NOT IN ('student', 'trainer') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;
  IF p_role = 'trainer' AND COALESCE(trim(p_cref), '') = '' THEN RAISE EXCEPTION 'CREF_REQUIRED'; END IF;

  SELECT raw_app_meta_data ->> 'provider', COALESCE(raw_user_meta_data ->> 'onboarded' = 'true', false)
    INTO _prov, _done FROM auth.users WHERE id = _uid;
  IF _prov IS NULL OR _prov = 'email' OR _done THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  SELECT id INTO _pid FROM public.profiles WHERE user_id = _uid;
  IF _pid IS NULL THEN RAISE EXCEPTION 'NO_PROFILE'; END IF;

  IF p_role = 'trainer' THEN
    UPDATE public.profiles SET role = 'trainer' WHERE id = _pid;
    INSERT INTO public.trainer_profiles (profile_id, cref) VALUES (_pid, trim(p_cref))
    ON CONFLICT (profile_id) DO UPDATE SET cref = EXCLUDED.cref;
  END IF;

  UPDATE auth.users
     SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('onboarded', true, 'role', p_role)
   WHERE id = _uid;
END $$;

REVOKE EXECUTE ON FUNCTION public.complete_social_signup(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_social_signup(text, text) TO authenticated;
