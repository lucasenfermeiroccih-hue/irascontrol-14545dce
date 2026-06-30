-- Módulo Maternidade v2: estrutura separada por categoria

-- Partos mensais
create table if not exists maternidade_partos (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid not null,
  mes text not null,
  ano text not null,
  nome_profissional text not null default '',
  data_registro date not null default current_date,
  total_partos integer not null default 0,
  partos_normais integer not null default 0,
  cesarianas integer not null default 0,
  observacoes text not null default '',
  created_at timestamptz not null default now()
);

-- Casos individuais (puerperal e ISC pós-cesariana)
create table if not exists maternidade_casos (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid not null,
  tipo text not null check (tipo in ('puerperal','isc_cesariana')),
  mes text not null,
  ano text not null,
  nome_paciente text not null,
  prontuario text not null default '',
  data_parto date,
  data_reintranacao date,
  medico_prestador text not null default '',
  status_caso text not null default 'suspeito' check (status_caso in ('confirmado','suspeito')),
  classificacao_isc text not null default '',
  comorbidades text not null default '',
  pre_eclampsia boolean not null default false,
  observacoes text not null default '',
  created_at timestamptz not null default now()
);

-- Busca ativa pós-alta mensal
create table if not exists maternidade_busca_ativa (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid not null,
  mes text not null,
  ano text not null,
  total_cesarianas_periodo integer not null default 0,
  contatos_ligacoes integer not null default 0,
  contatos_whatsapp integer not null default 0,
  contatos_revisao_prontuario integer not null default 0,
  retornos_confirmados integer not null default 0,
  casos_confirmados integer not null default 0,
  observacoes text not null default '',
  created_at timestamptz not null default now()
);

-- Educação permanente
create table if not exists maternidade_educacao (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid not null,
  data_atividade date not null,
  tema text not null,
  descricao text not null default '',
  facilitador text not null default '',
  participantes integer not null default 0,
  observacoes text not null default '',
  created_at timestamptz not null default now()
);

-- RLS
alter table maternidade_partos enable row level security;
alter table maternidade_casos enable row level security;
alter table maternidade_busca_ativa enable row level security;
alter table maternidade_educacao enable row level security;

create policy "members_maternidade_partos" on maternidade_partos for all
  using (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()))
  with check (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()));

create policy "members_maternidade_casos" on maternidade_casos for all
  using (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()))
  with check (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()));

create policy "members_maternidade_busca_ativa" on maternidade_busca_ativa for all
  using (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()))
  with check (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()));

create policy "members_maternidade_educacao" on maternidade_educacao for all
  using (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()))
  with check (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()));
