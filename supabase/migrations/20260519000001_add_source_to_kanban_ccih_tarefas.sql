-- Adiciona coluna source para distinguir tarefas criadas no IRASControl vs Guardião
ALTER TABLE public.kanban_ccih_tarefas
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ccih'
CHECK (source IN ('ccih', 'guardiao'));

-- Migra as tarefas do kanban_tasks para kanban_ccih_tarefas com source='guardiao'
INSERT INTO public.kanban_ccih_tarefas
  (hospital_id, title, description, assigned_to, assigned_to_ids, assigned_by,
   recurrence, status, priority, last_completed_at, source)
SELECT
  hospital_id,
  title,
  description,
  assigned_to,
  CASE WHEN assigned_to IS NOT NULL THEN ARRAY[assigned_to] ELSE '{}'::uuid[] END,
  assigned_by,
  CASE WHEN recurrence = 'none' THEN 'once' ELSE recurrence END,
  status,
  priority,
  last_completed_at,
  'guardiao'
FROM public.kanban_tasks
WHERE hospital_id IS NOT NULL
  AND id NOT IN (
    SELECT kt.id FROM public.kanban_tasks kt
    JOIN public.kanban_ccih_tarefas kct
      ON kct.title = kt.title
      AND kct.hospital_id = kt.hospital_id
      AND kct.source = 'guardiao'
  );
