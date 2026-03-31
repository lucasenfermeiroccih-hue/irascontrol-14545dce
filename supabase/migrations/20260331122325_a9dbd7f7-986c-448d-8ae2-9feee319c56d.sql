
-- =============================================================
-- FIX 1: Privilege Escalation in user_roles
-- Remove INSERT/DELETE policies scoped to {public} that rely on
-- has_role() reading from the same table. Role management is 
-- already handled securely via edge functions with service_role.
-- =============================================================

-- Drop the dangerous INSERT policy
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;

-- Drop the dangerous DELETE policy  
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;

-- =============================================================
-- FIX 2: hospitals_summary view RLS
-- The view was created with security_invoker=true, which means
-- the hospitals base table RLS applies. But regular members have
-- no SELECT policy on hospitals. We need to add one for non-contact
-- fields access. Since security_invoker views inherit RLS, we add
-- a policy on the base hospitals table for regular members.
-- =============================================================

-- Add SELECT policy for regular hospital members (non-admin)
-- This allows the hospitals_summary view (security_invoker) to work
CREATE POLICY "Hospital members can view own hospital basic info"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

-- Drop the admin-only policy since the new one is broader and includes admins
DROP POLICY IF EXISTS "Hospital admins can view own hospital" ON public.hospitals;
