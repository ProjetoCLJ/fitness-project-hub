-- 0006: Visibilidade do professor na busca e dos horários para novos alunos.

-- Chave geral: o professor só aparece na busca quando liga (padrão desligado).
ALTER TABLE public.trainer_profiles ADD COLUMN listed_in_search boolean NOT NULL DEFAULT false;

-- Por bloco de expediente: visível (ou não) na busca/agendamento de novos alunos.
ALTER TABLE public.schedule_events ADD COLUMN public_visible boolean NOT NULL DEFAULT true;

-- Exceções por horário: horários livres que o professor oculta da busca em uma data específica.
CREATE TABLE public.hidden_slots (
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trainer_id, slot_date, start_time)
);

ALTER TABLE public.hidden_slots ENABLE ROW LEVEL SECURITY;
-- Leitura para quem está logado (a agenda também é legível); gestão só pelo próprio professor.
CREATE POLICY "Authenticated read hidden slots" ON public.hidden_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainer manages hidden slots" ON public.hidden_slots FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id()) WITH CHECK (trainer_id = public.current_trainer_id());

-- Para aparecer na busca o professor precisa ter o preço da aula definido.
CREATE OR REPLACE FUNCTION public.require_price_to_list() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.listed_in_search AND COALESCE(NEW.base_price, 0) <= 0 THEN
    RAISE EXCEPTION 'PRICE_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_trainer_require_price BEFORE INSERT OR UPDATE ON public.trainer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.require_price_to_list();
