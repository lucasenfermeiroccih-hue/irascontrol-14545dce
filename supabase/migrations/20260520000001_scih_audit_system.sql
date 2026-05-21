-- ============================================================
-- SCIH Audit System — HGNI
-- Tabelas para auditoria completa por setor hospitalar
-- ============================================================

-- 1. Auditorias por setor (resultado final)
CREATE TABLE public.scih_sector_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  sector_key text NOT NULL,
  sector_name text NOT NULL,
  auditor_name text,
  auditor_id uuid REFERENCES auth.users(id),
  responsible_name text,
  audit_date date NOT NULL DEFAULT CURRENT_DATE,
  audit_time time,
  audit_type text NOT NULL DEFAULT 'Rotina',
  participants text,
  observations text,
  total_items integer NOT NULL DEFAULT 0,
  compliant_items integer NOT NULL DEFAULT 0,
  partial_items integer NOT NULL DEFAULT 0,
  nc_items integer NOT NULL DEFAULT 0,
  na_items integer NOT NULL DEFAULT 0,
  compliance_rate numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Respostas individuais do checklist
CREATE TABLE public.scih_sector_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.scih_sector_audits(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  item_index integer NOT NULL,
  question text NOT NULL,
  response text CHECK (response IN ('conf', 'parc', 'nc', 'na', '')),
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Não conformidades
CREATE TABLE public.scih_ncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  audit_id uuid REFERENCES public.scih_sector_audits(id),
  sector_key text NOT NULL,
  sector_name text NOT NULL,
  question text NOT NULL,
  observation text,
  severity text NOT NULL DEFAULT 'Menor' CHECK (severity IN ('Crítica', 'Maior', 'Menor')),
  status text NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta', 'Em análise', 'Ação criada', 'Verificada', 'Encerrada')),
  audit_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Histórico de status das NCs
CREATE TABLE public.scih_nc_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id uuid NOT NULL REFERENCES public.scih_ncs(id) ON DELETE CASCADE,
  status text NOT NULL,
  observation text,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Planos de ação 5W2H
CREATE TABLE public.scih_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  nc_id uuid REFERENCES public.scih_ncs(id),
  what text NOT NULL,
  why text,
  where_sector text,
  when_date date,
  who text,
  how text,
  how_much text,
  status text NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Concluído', 'Atrasado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Kanban de ações
CREATE TABLE public.scih_kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  title text NOT NULL,
  sector text,
  priority text DEFAULT 'amber' CHECK (priority IN ('red', 'amber', 'teal')),
  deadline date,
  column_id text NOT NULL DEFAULT 'backlog' CHECK (column_id IN ('backlog', 'doing', 'review', 'done')),
  card_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Itens SWOT
CREATE TABLE public.scih_swot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  sector_key text NOT NULL,
  quadrant text NOT NULL CHECK (quadrant IN ('f', 'o', 'w', 'a')),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Matriz de risco
CREATE TABLE public.scih_risk_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  description text NOT NULL,
  probability integer NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact integer NOT NULL CHECK (impact BETWEEN 1 AND 5),
  sector text,
  contingency_plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Indicadores IRAS (boletim epidemiológico)
CREATE TABLE public.scih_iras_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  indicator_type text NOT NULL,
  sector text,
  cases integer NOT NULL DEFAULT 0,
  denominator integer NOT NULL DEFAULT 100,
  period text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Cronograma de auditorias
CREATE TABLE public.scih_audit_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  sector_key text NOT NULL,
  planned_date date NOT NULL,
  audit_type text DEFAULT 'Rotina',
  responsible text,
  completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.scih_sector_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_sector_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_ncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_nc_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_swot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_risk_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_iras_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scih_audit_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para scih_sector_audits
CREATE POLICY "scih_sector_audits_select" ON public.scih_sector_audits FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_sector_audits_insert" ON public.scih_sector_audits FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_sector_audits_update" ON public.scih_sector_audits FOR UPDATE TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_sector_audits_delete" ON public.scih_sector_audits FOR DELETE TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

-- Políticas para scih_sector_responses (via audit)
CREATE POLICY "scih_sector_responses_all" ON public.scih_sector_responses FOR ALL TO authenticated
  USING (audit_id IN (SELECT id FROM public.scih_sector_audits WHERE hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid())));

-- Políticas para scih_ncs
CREATE POLICY "scih_ncs_select" ON public.scih_ncs FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_ncs_insert" ON public.scih_ncs FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_ncs_update" ON public.scih_ncs FOR UPDATE TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_ncs_delete" ON public.scih_ncs FOR DELETE TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

-- Políticas para scih_nc_history
CREATE POLICY "scih_nc_history_all" ON public.scih_nc_history FOR ALL TO authenticated
  USING (nc_id IN (SELECT id FROM public.scih_ncs WHERE hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid())));

-- Políticas para scih_action_plans
CREATE POLICY "scih_action_plans_select" ON public.scih_action_plans FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_action_plans_insert" ON public.scih_action_plans FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_action_plans_update" ON public.scih_action_plans FOR UPDATE TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));
CREATE POLICY "scih_action_plans_delete" ON public.scih_action_plans FOR DELETE TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

-- Políticas genéricas para outras tabelas (hospital_id based)
CREATE POLICY "scih_kanban_cards_all" ON public.scih_kanban_cards FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

CREATE POLICY "scih_swot_items_all" ON public.scih_swot_items FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

CREATE POLICY "scih_risk_items_all" ON public.scih_risk_items FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

CREATE POLICY "scih_iras_indicators_all" ON public.scih_iras_indicators FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

CREATE POLICY "scih_audit_schedules_all" ON public.scih_audit_schedules FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.user_hospital_access WHERE user_id = auth.uid()));

-- Índices para performance
CREATE INDEX idx_scih_sector_audits_hospital ON public.scih_sector_audits(hospital_id);
CREATE INDEX idx_scih_sector_audits_sector ON public.scih_sector_audits(sector_key);
CREATE INDEX idx_scih_ncs_hospital ON public.scih_ncs(hospital_id);
CREATE INDEX idx_scih_ncs_status ON public.scih_ncs(status);
CREATE INDEX idx_scih_action_plans_hospital ON public.scih_action_plans(hospital_id);
CREATE INDEX idx_scih_kanban_cards_hospital ON public.scih_kanban_cards(hospital_id);
CREATE INDEX idx_scih_audit_schedules_hospital ON public.scih_audit_schedules(hospital_id);
