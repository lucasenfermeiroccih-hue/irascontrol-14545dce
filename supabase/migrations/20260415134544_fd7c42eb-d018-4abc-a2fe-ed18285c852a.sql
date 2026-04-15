
-- Fix broken self-join in "Primary admins can view full hospital info" policy
DROP POLICY IF EXISTS "Primary admins can view full hospital info" ON public.hospitals;
CREATE POLICY "Primary admins can view full hospital info"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM hospital_users hu
    WHERE hu.hospital_id = hospitals.id
      AND hu.user_id = auth.uid()
      AND hu.is_primary_admin = true
  ))
  OR
  (has_role(auth.uid(), 'hospital_admin'::app_role)
   AND id IN (SELECT public.get_user_hospital_ids(auth.uid())))
);
