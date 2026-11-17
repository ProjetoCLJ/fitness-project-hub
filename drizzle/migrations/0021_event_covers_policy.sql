-- 0020 · Capas de eventos: só quem enxerga o evento (ou quem enviou a capa) pode ler o arquivo.
-- Antes, qualquer pessoa logada lia QUALQUER arquivo do bucket event-covers, inclusive capas de eventos privados.
-- O app só gera links de capas de eventos que a pessoa já consegue ver (a lista de eventos passa pela regra de acesso
-- da tabela events) ou de capas que ela mesma enviou; por isso a regra nova não muda nada do que existe hoje.

DROP POLICY IF EXISTS "Authenticated read event covers" ON storage.objects;
DROP POLICY IF EXISTS "Read event covers of visible events" ON storage.objects;

CREATE POLICY "Read event covers of visible events" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND (
      -- as capas que a própria pessoa enviou (inclusive antes de o evento existir)
      (storage.foldername(name))[1] = auth.uid()::text
      -- a capa de qualquer evento que ela pode ver (a consulta abaixo respeita a regra de acesso da tabela events)
      OR EXISTS (SELECT 1 FROM public.events e WHERE e.cover_path = storage.objects.name)
    )
  );
