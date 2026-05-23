-- Fix: add hospital-scoped RLS policies for hospital_tool_installations.
-- The previous security hardening migration dropped 'installations_all' but
-- never created replacement policies, blocking all INSERT/UPDATE operations.

CREATE POLICY "installations_select_by_hospital"
  ON public.hospital_tool_installations FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "installations_insert_by_hospital"
  ON public.hospital_tool_installations FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "installations_update_by_hospital"
  ON public.hospital_tool_installations FOR UPDATE TO authenticated
  USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
  WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "installations_delete_by_hospital"
  ON public.hospital_tool_installations FOR DELETE TO authenticated
  USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));
