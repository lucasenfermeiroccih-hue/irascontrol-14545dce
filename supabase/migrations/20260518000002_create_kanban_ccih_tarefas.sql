CREATE TABLE IF NOT EXISTS public.kanban_ccih_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  assigned_to_ids UUID[] NOT NULL DEFAULT '{}',
  assigned_by UUID,
  recurrence TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'in_progress',
  priority TEXT NOT NULL DEFAULT 'normal',
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kanban_ccih_tarefas_recurrence_check
    CHECK (recurrence = ANY(ARRAY['daily','weekly','monthly','once'])),
  CONSTRAINT kanban_ccih_tarefas_status_check
    CHECK (status = ANY(ARRAY['in_progress','completed'])),
  CONSTRAINT kanban_ccih_tarefas_priority_check
    CHECK (priority = ANY(ARRAY['low','normal','high']))
);

ALTER TABLE public.kanban_ccih_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital members view ccih tarefas"
  ON public.kanban_ccih_tarefas FOR SELECT TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.hospital_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "hospital members insert ccih tarefas"
  ON public.kanban_ccih_tarefas FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.hospital_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "hospital members update ccih tarefas"
  ON public.kanban_ccih_tarefas FOR UPDATE TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.hospital_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "hospital members delete ccih tarefas"
  ON public.kanban_ccih_tarefas FOR DELETE TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.hospital_users WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.update_kanban_ccih_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_kanban_ccih_updated
  BEFORE UPDATE ON public.kanban_ccih_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.update_kanban_ccih_updated_at();
