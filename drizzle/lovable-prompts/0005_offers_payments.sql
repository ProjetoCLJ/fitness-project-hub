-- 0005: Ofertas (pacotes) do professor e lançamento de pagamentos (inclusive de quem não é aluno na plataforma).

-- ============ Ofertas ============
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  classes_count integer NOT NULL CHECK (classes_count > 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX offers_trainer_idx ON public.offers (trainer_id);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manages own offers" ON public.offers FOR ALL TO authenticated
  USING (trainer_id = public.current_trainer_id()) WITH CHECK (trainer_id = public.current_trainer_id());

-- ============ Pagamentos ============
-- Pagamento pode ser de um aluno da plataforma (student_id) ou de alguém digitado manualmente (payer_name).
ALTER TABLE public.payments ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN payer_name text;
ALTER TABLE public.payments ADD COLUMN offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN offer_name text;
ALTER TABLE public.payments ADD COLUMN method text CHECK (method IS NULL OR method IN ('pix', 'dinheiro', 'cartao', 'boleto'));
ALTER TABLE public.payments ADD CONSTRAINT payments_payer_check
  CHECK (student_id IS NOT NULL OR char_length(btrim(COALESCE(payer_name, ''))) > 0);
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount >= 0);
CREATE INDEX payments_trainer_date_idx ON public.payments (trainer_id, payment_date DESC);
CREATE INDEX payments_student_idx ON public.payments (student_id);

-- As políticas existentes ("Involved view payments" e "Trainer manages payments") continuam valendo:
-- o professor lança, edita e apaga os próprios pagamentos; o aluno só enxerga os dele.
