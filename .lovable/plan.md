
# SaaS de Controle de Infecção Hospitalar (IRAS)

## Visão Geral
Sistema completo de monitoramento e análise de infecções hospitalares com formulários de auditoria, dashboards analíticos, gestão de casos e suporte de IA. Todos os dados serão mock inicialmente.

## Fase 1 — Estrutura Base e Autenticação

### Landing Page (`/`)
- Hero section com mockup do sistema e CTA "Começar Agora"
- Navegação superior com links para funcionalidades e preços
- Seção "Por que a gestão convencional falha" com estatísticas
- Tabela de preços, prova social e formulário de captura

### Página de Preços (`/pricing`)
- Alternador mensal/anual, cards de planos, seletor de leitos, módulos add-on, tabela comparativa

### Auth (`/login`, `/register`)
- Formulários de login e cadastro com dados mock
- Redirecionamento para dashboard após autenticação

### Layout Interno
- Sidebar com navegação para todas as seções do sistema
- Header com perfil do usuário e notificações

## Fase 2 — Dashboard Principal e Monitoramento

### Dashboard Principal (`/dashboard`)
- Filtros globais (data, unidade, tipo de infecção)
- KPI cards com cores de prioridade (pacientes monitorados, suspeitos, confirmados)
- Gráficos de indicadores IRAS e dispositivos
- Mapa de risco por setor, alertas de surtos, top microrganismos
- Botão Assistente de IA

### Monitoramento de Pacientes (`/patients/monitoring`)
- Busca inteligente, cards de resumo por paciente
- Checklist de dispositivos invasivos, seletor de antibióticos
- Timeline clínica, classificação de risco, alertas de infecção

## Fase 3 — Formulários de Auditoria

### Auditoria de Bundles CVC/SVD (`/audits/bundles/new`)
- Campos de identificação, dados CVC e SVD com cálculo automático de taxas de adesão

### Higienização das Mãos (`/audits/hand-hygiene/new`)
- Campos de observação, 5 momentos OMS, técnica utilizada

### Vigilância de Processos (`/audits/infection-control/new`)
- Barra de progresso, categorias em acordeão (Ventilação, Cateter, CVC, Precaução)
- Chips de resposta (Conforme/Não Conforme/N/A), painel de resumo em tempo real

### Vigilância de Dispenser (`/audits/dispenser/new`)
- Questionário de conformidade com painel resumo automático, rascunho e conclusão

### Auditoria CTI (`/audits/infrastructure/cti/new`)
- Checklists por categoria (medicações, limpeza, equipamentos, resíduos)
- Cards de indicadores em tempo real

### Sensibilidade Microbiana (`/audits/antimicrobial-sensitivity/new`)
- Identificação de coleta, seleção de microrganismo, entrada de resultados
- Interpretação SIR automática (BrCAST/EUCAST), sinalização de resistência crítica

## Fase 4 — Dashboards e Monitoramento Específicos

### Dashboard Bundles (`/dashboard/bundles-compliance`)
- KPIs, gráficos de rosca CVC/SVD, badges de adesão, tabela detalhada

### Dashboard Vigilância (`/dashboard/infection-control`)
- Índice geral de conformidade, gráfico por protocolo, ranking top 5 falhas

### Monitoramento de Higiene (`/hygiene/monitoring`)
- KPIs, infográfico 5 momentos, lista de registros com status visual

### Monitoramento de Precaução (`/precautions/monitoring/:id`)
- Card de conformidade circular, grupos de itens, metadados

### Monitoramento de Antimicrobianos (`/antimicrobials/monitoring`)
- KPIs de stewardship, gráfico de tendência, mapa de calor por setor
- Tabela de prescrições, alertas operacionais

## Fase 5 — Investigação e Alertas

### Notificação e Investigação CCIH (`/cases/investigation`)
- Identificação do paciente, classificação do evento, status da investigação
- Critérios diagnósticos, resultados laboratoriais, dispositivos invasivos
- Checklist de investigação, conclusão e encerramento

### Alertas Críticos (`/alerts`)
- Filtros de prioridade, lista de alertas, ações sugeridas, detalhes da ocorrência

### Resultados Laboratoriais (`/laboratory-results`)
- Filtros de busca, lista de resultados, perfil de resistência, importação de dados

## Fase 6 — Relatórios e Gestão

### Relatórios e Análises (`/reports`)
- Filtros, gráficos de tendência, insights de IA, tabela consolidada, exportação

### Indicadores Gerais (`/reports/analytics`)
- Gráficos de infecção e dispositivos, perfil microbiológico, consumo de antimicrobianos
- Conformidade executiva, configuração de relatórios automáticos

### Gestão de Formulários (`/forms`, `/forms/:id/edit`)
- Lista de modelos, criação e edição dinâmica

## Fase 7 — Administração e Configurações

### Configurações Admin (`/admin/settings`)
- Gestão de usuários, perfis/permissões, setores, tipos de infecção, alertas, protocolos

### Configurações do Usuário (`/settings/profile`, `/settings`)
- Alteração de senha, notificações, tema, idioma, gestão de permissões RBAC

### CRM (`/crm`)
- Tabela de instituições/unidades, cadastro de clientes

### Marketplace (`/marketplace`)
- Cards de protocolos/extensões, seção de desenvolvedor API

## Design
- Interface profissional e limpa, voltada para ambiente hospitalar
- Cores semânticas: verde (conforme), vermelho (não conforme), amarelo (alerta)
- Responsivo para uso em tablets durante rondas hospitalares
- Componentes Shadcn/UI com tema personalizado para saúde
