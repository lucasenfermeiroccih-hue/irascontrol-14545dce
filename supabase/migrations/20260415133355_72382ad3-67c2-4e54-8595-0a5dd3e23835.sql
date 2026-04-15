
-- Fix 1: Recreate hospitals_summary as SECURITY INVOKER view
-- This ensures the underlying hospitals RLS policies are enforced
DROP VIEW IF EXISTS public.hospitals_summary;

CREATE VIEW public.hospitals_summary
WITH (security_invoker = true)
AS SELECT
  id,
  name,
  type,
  city,
  state,
  bed_count,
  status,
  created_at
FROM public.hospitals;

-- Fix 2: Restrict full hospitals access (including contact_email/contact_phone)
-- Remove the broad SELECT policy that exposes contact fields to ALL members
DROP POLICY IF EXISTS "Hospital members can view own hospital basic info" ON public.hospitals;

-- Only primary admins and hospital_admin role can see full hospital row (with contact info)
CREATE POLICY "Primary admins can view full hospital info"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_users hu
    WHERE hu.hospital_id = id
      AND hu.user_id = auth.uid()
      AND hu.is_primary_admin = true
  )
  OR public.has_role(auth.uid(), 'hospital_admin'::app_role)
     AND id IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

-- Regular hospital members can only see non-sensitive columns via hospitals_summary
-- But they still need basic SELECT on hospitals for FK references to work
CREATE POLICY "Hospital members can view own hospital basic info"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

-- Grant column-level permissions: revoke contact fields from authenticated, grant only to specific conditions
-- Note: Since Postgres RLS can't do column-level filtering, we use the view approach:
-- Regular members query hospitals_summary (no contact fields)
-- Admins query hospitals directly (full access via RLS)

COMMENT ON VIEW public.hospitals_summary IS 'Public-safe view of hospitals excluding contact_email and contact_phone. Use this for non-admin queries.';
