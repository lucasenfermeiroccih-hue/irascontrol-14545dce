
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS sample_category text,
  ADD COLUMN IF NOT EXISTS sample_material text,
  ADD COLUMN IF NOT EXISTS sample_location_enabled text DEFAULT 'na',
  ADD COLUMN IF NOT EXISTS sample_location_detail text,
  ADD COLUMN IF NOT EXISTS esbl text DEFAULT 'ignorado',
  ADD COLUMN IF NOT EXISTS carbapenemase text DEFAULT 'ignorado',
  ADD COLUMN IF NOT EXISTS carbapenemase_type text;

ALTER TABLE public.antibiogram_results
  ADD COLUMN IF NOT EXISTS sir_category text DEFAULT 'NT';

CREATE TABLE IF NOT EXISTS public.microorganisms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.microorganisms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view microorganisms" ON public.microorganisms;
CREATE POLICY "Authenticated users can view microorganisms"
ON public.microorganisms FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Super admins can manage microorganisms" ON public.microorganisms;
CREATE POLICY "Super admins can manage microorganisms"
ON public.microorganisms FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_microorganisms_name ON public.microorganisms (lower(name));
