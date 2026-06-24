-- Fotos de auditoria: coluna em audits + bucket privado no Storage
-- Permite que o auditor anexe fotos (câmera ou galeria) às auditorias.

-- 1. Coluna para armazenar os caminhos das fotos no Storage
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

-- 2. Bucket privado para as fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-photos', 'audit-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de acesso (caminho: {hospital_id}/{audit_id}/{arquivo})
--    Usuário só acessa fotos de hospitais aos quais tem vínculo.
DROP POLICY IF EXISTS "audit_photos_insert" ON storage.objects;
CREATE POLICY "audit_photos_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audit-photos'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

DROP POLICY IF EXISTS "audit_photos_select" ON storage.objects;
CREATE POLICY "audit_photos_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audit-photos'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

DROP POLICY IF EXISTS "audit_photos_delete" ON storage.objects;
CREATE POLICY "audit_photos_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audit-photos'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_hospital_ids(auth.uid()))
);
