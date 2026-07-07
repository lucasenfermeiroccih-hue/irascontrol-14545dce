import type {
  AuditManagerReportMetrics,
  MonthlySectorCompiledAuditMetrics,
  AuditActionPlanRecord,
} from "./auditReportTypes";

export function getAuditTypeName(auditType: string): string {
  const map: Record<string, string> = {
    bundles: "Bundles CVC/SVD",
    hand_hygiene: "Higienização das Mãos",
    infection_control: "Controle de Infecção",
    dispenser: "Dispensadores",
    cti_infrastructure: "Infraestrutura CTI",
    antibiogram: "Antibiograma",
    precaution: "Precauções e Isolamento",
    hand_hygiene_consumption: "Consumo de Produtos de Higienização",
    construction_renovation: "Obras e Reformas",
  };
  return map[auditType] || auditType;
}

export function getAuditTechnicalConcept(auditType: string): string {
  const concepts: Record<string, string> = {
    hand_hygiene:
      "A auditoria de higienização das mãos avalia a adesão dos profissionais de saúde à execução da técnica correta nos cinco momentos preconizados pela OMS: (1) antes do contato com o paciente; (2) antes de procedimento asséptico; (3) após risco de exposição a fluidos; (4) após contato com o paciente; (5) após contato com superfícies próximas ao paciente. A higienização das mãos é a principal barreira para prevenção de infecções relacionadas à assistência à saúde (IRAS) e transmissão cruzada de micro-organismos. A não adesão constitui risco transversal para todos os pacientes do setor.",
    bundles:
      "A auditoria do bundle de CVC e SVD avalia a conformidade com o conjunto de medidas que, quando aplicadas de forma sistemática, reduzem as infecções associadas a dispositivos invasivos. Para o CVC, são avaliados: indicação diária, inserção com técnica asséptica máxima, manutenção do curativo, manipulação do sistema fechado, validade do cateter e oportunidade de retirada precoce. Para o SVD: indicação, técnica de inserção, sistema fechado de drenagem, fixação, manutenção e retirada precoce. A conformidade do bundle deve ser interpretada junto aos dados de IPCSL e ITU-SVD do setor.",
    infection_control:
      "A auditoria de controle de infecção avalia a adesão às práticas e protocolos de prevenção de IRAS no setor, incluindo técnica asséptica, uso correto de EPI, precauções padrão e de transmissão, gestão de resíduos, desinfecção de equipamentos e superfícies, e registro adequado das práticas assistenciais. As não conformidades em controle de infecção representam risco direto de transmissão horizontal de micro-organismos e aumento da incidência de IRAS.",
    dispenser:
      "A auditoria de dispensadores avalia a disponibilidade, acessibilidade, funcionamento e abastecimento dos dispensadores de álcool gel, sabonete líquido e papel toalha nos pontos de cuidado. A ausência, falha ou inadequação dos dispensadores constitui barreira direta à higienização das mãos e fator de risco para IRAS. Os dispensadores devem estar acessíveis no ponto de cuidado, em perfeito funcionamento, abastecidos e com produto disponível.",
    cti_infrastructure:
      "A auditoria de infraestrutura de CTI avalia as condições físicas e estruturais da unidade de terapia intensiva em relação aos requisitos normativos de segurança assistencial, incluindo ventilação, iluminação, lavabos, pontos de álcool gel, espaçamento entre leitos, sinalização de precauções, condições dos equipamentos e adequação às normas da ANVISA e RDC vigentes.",
    antibiogram:
      "A auditoria de antibiograma avalia o processo de prescrição de antimicrobianos, a adequação ao perfil microbiológico local, a aplicação dos protocolos de stewardship antimicrobiano e a rastreabilidade dos resultados laboratoriais na tomada de decisão clínica.",
    precaution:
      "A auditoria de precauções e isolamento avalia a adesão às medidas de barreira — padrão, por contato, por gotículas e por aerossol — incluindo sinalização correta, uso de EPI adequado ao tipo de precaução, fluxo de cuidado, gestão de equipamentos, manejo de visitas e registro de isolamento. A não adesão representa risco imediato de disseminação de micro-organismos e surtos.",
    hand_hygiene_consumption:
      "O indicador de consumo de produtos de higienização das mãos avalia o consumo de álcool gel e sabonete líquido em relação ao volume de assistência prestada (paciente-dia). O consumo insuficiente pode indicar falha na higienização das mãos; o consumo excessivo pode indicar desperdício ou não conformidade na técnica.",
    construction_renovation:
      "A auditoria de obras e reformas avalia o cumprimento das medidas de controle de riscos ambientais durante obras, reformas e manutenções realizadas em áreas hospitalares, incluindo barreiras físicas, controle de poeira e aerossóis, fluxo de circulação, descarte de resíduos e mitigação do risco de infecções fúngicas e respiratórias em pacientes imunossuprimidos.",
  };
  return concepts[auditType] || "Auditoria de conformidade com protocolo institucional, avaliando itens estabelecidos nas diretrizes internas e normas regulatórias vigentes.";
}

function generatePerformanceText(rate: number, sectorName: string): string {
  if (rate >= 95)
    return `O setor **${sectorName}** apresentou desempenho **excelente** no período analisado (${rate}%). O resultado indica alta adesão às práticas auditadas. Recomenda-se manter a rotina de vigilância, devolutiva e auditoria periódica para sustentação do resultado. Valorizar a equipe pelo desempenho.`;
  if (rate >= 85)
    return `O setor **${sectorName}** apresentou **bom desempenho** no período (${rate}%). Existem oportunidades de melhoria pontuais que devem ser tratadas com devolutiva direcionada, feedback individual e reauditoria. A meta de excelência (≥95%) está próxima e é alcançável com ajustes específicos.`;
  if (rate >= 70)
    return `O setor **${sectorName}** apresentou desempenho **regular** no período (${rate}%), indicando necessidade de plano de melhoria estruturado. Recomenda-se acompanhamento próximo, reforço do processo junto à equipe, feedback coletivo e individual, e reauditoria em até 30 dias.`;
  return `O setor **${sectorName}** apresentou desempenho **crítico** no período (${rate}%), com risco assistencial relevante. Recomenda-se **intervenção imediata**: feedback à equipe, plano de ação com responsável definido, capacitação em serviço e reauditoria em curto prazo (≤15 dias). O gestor deve ser notificado formalmente.`;
}

function generateRiskAnalysisText(rate: number, auditType: string, topNCs: Array<{ question: string; count: number }>): string {
  const typeName = getAuditTypeName(auditType);
  const mainNC = topNCs[0]?.question || "não conformidade identificada";
  if (rate < 70)
    return `A conformidade de ${rate}% em **${typeName}** representa risco assistencial **alto**. A principal fragilidade identificada — "${mainNC}" — exige intervenção imediata. O risco de eventos adversos relacionados à assistência é elevado neste contexto.`;
  if (rate < 85)
    return `A conformidade de ${rate}% em **${typeName}** representa risco assistencial **moderado**. A principal fragilidade — "${mainNC}" — deve ser tratada como prioridade no próximo ciclo de melhoria.`;
  return `A conformidade de ${rate}% em **${typeName}** representa risco assistencial **baixo a controlado**. Manter vigilância sobre: "${mainNC}".`;
}

function generateProbableCauseText(topNCs: Array<{ question: string; category: string; count: number }>): string {
  if (topNCs.length === 0) return "Não foram identificadas não conformidades no período analisado.";
  const cats = [...new Set(topNCs.map(n => n.category))];
  return `As principais não conformidades identificadas concentram-se nas categorias: **${cats.join(", ")}**. A análise das causas prováveis aponta para: (1) falha de adesão aos protocolos — possível relacionada à sobrecarga de trabalho ou falta de internalização do protocolo pela equipe; (2) necessidade de reforço de treinamento e supervisão; (3) possível déficit de materiais ou infraestrutura de apoio. Recomenda-se análise por diagrama de Ishikawa com a equipe para identificação da causa-raiz e definição de intervenção eficaz.`;
}

function generateResultsDiscussion(
  rate: number, metrics: AuditManagerReportMetrics, sectorName: string, auditType: string
): string {
  const typeName = getAuditTypeName(auditType);
  const worstCat = Object.entries(metrics.complianceByCategory).sort((a, b) => a[1] - b[1])[0];
  const bestCat = Object.entries(metrics.complianceByCategory).sort((a, b) => b[1] - a[1])[0];

  let text = `A análise das **${metrics.totalAudits} auditorias** de **${typeName}** realizadas no setor **${sectorName}** resultou em conformidade geral de **${rate}%**, com **${metrics.compliantItems} itens conformes** e **${metrics.nonCompliantItems} não conformes** em um total de **${metrics.totalItems - metrics.notApplicableItems} itens avaliados**.\n\n`;

  if (worstCat) {
    text += `A categoria com menor desempenho foi **"${worstCat[0]}"** (${worstCat[1]}%), indicando necessidade de intervenção prioritária neste aspecto. `;
  }
  if (bestCat && bestCat[0] !== worstCat?.[0]) {
    text += `Por outro lado, **"${bestCat[0]}"** apresentou o melhor desempenho (${bestCat[1]}%), demonstrando boa adesão nesta categoria. `;
  }

  if (metrics.topNonCompliances.length > 0) {
    text += `\n\nA não conformidade mais frequente foi **"${metrics.topNonCompliances[0].question}"** (${metrics.topNonCompliances[0].count} ocorrências), o que requer ação estruturada e reauditoria direcionada.`;
  }

  if (metrics.lowSampleAlert) {
    text += `\n\n> **Alerta de amostragem:** O número de auditorias realizadas no período (${metrics.totalAudits}) é insuficiente para conclusões estatisticamente robustas. Recomenda-se ampliar o número de auditorias no próximo ciclo.`;
  }

  return text;
}

function formatActionPlanRows(actions: AuditActionPlanRecord[]): string {
  if (!actions.length) return "| — | — | — | — | — | — | — |\n";
  return actions.map(a =>
    `| ${a.action} | ${a.reason} | Setor | ${a.responsible} | ${a.deadline} | ${a.how} | ${a.status} |`
  ).join("\n");
}

function formatTopNcRows(ncs: Array<{ category: string; question: string; count: number }>): string {
  if (!ncs.length) return "| — | — | — | — |\n";
  return ncs.map(n =>
    `| ${n.category} | ${n.question} | ${n.count} | Moderado a Alto |`
  ).join("\n");
}

function generateRiskMatrixRows(metrics: AuditManagerReportMetrics, auditType: string): string {
  const typeName = getAuditTypeName(auditType);
  const rows: string[] = [];
  const rate = metrics.generalComplianceRate;

  if (rate < 70) {
    rows.push(`| Transmissão cruzada de IRAS | Conformidade crítica em ${typeName} (${rate}%) | Aumento de infecções hospitalares | ALTA |`);
  } else if (rate < 85) {
    rows.push(`| Risco assistencial moderado | Conformidade regular em ${typeName} (${rate}%) | Eventos adversos relacionados | MÉDIA |`);
  }

  metrics.topNonCompliances.slice(0, 3).forEach(nc => {
    rows.push(`| NC recorrente | "${nc.question}" (${nc.count}×) | Impacto na segurança do paciente | ${nc.count > 3 ? "ALTA" : "MÉDIA"} |`);
  });

  if (!rows.length) {
    rows.push(`| Risco residual controlado | Conformidade adequada em ${typeName} | Baixo impacto | BAIXA |`);
  }
  return rows.join("\n");
}

function generateTeamMeetingAgenda(metrics: AuditManagerReportMetrics, sectorName: string): string {
  const items = [
    `1. Apresentação dos resultados gerais de auditoria do setor **${sectorName}** no período.`,
    `2. Discussão das auditorias com maior índice de não conformidade.`,
    `3. Análise das principais não conformidades: ${metrics.topNonCompliances.slice(0, 3).map(n => `"${n.question}"`).join("; ")}.`,
    `4. Definição de responsáveis pelo plano de ação e prazos.`,
    `5. Definição de prazo de reauditoria (recomendado: 30 dias).`,
    `6. Registro de ciência da equipe e comprometimento com as melhorias.`,
  ];
  return items.join("\n");
}

export function generateAuditManagerReportMarkdown(params: {
  hospitalName: string;
  sectorName: string;
  auditType: string;
  periodStart: string;
  periodEnd: string;
  managerName?: string;
  managerEmail?: string;
  technicalResponsible?: string;
  generatedAt: string;
  metrics: AuditManagerReportMetrics;
  hospitalLogoUrl?: string;
  scihLogoUrl?: string;
}): string {
  const {
    hospitalName, sectorName, auditType, periodStart, periodEnd,
    managerName, managerEmail, technicalResponsible, generatedAt, metrics,
  } = params;

  const typeName = getAuditTypeName(auditType);
  const r = metrics.generalComplianceRate;
  const code = `IRAS-REL-${periodStart.replace(/-/g, "").slice(0, 6)}`;

  const positiveList = metrics.topPositiveFindings.length > 0
    ? metrics.topPositiveFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")
    : "Nenhum ponto positivo relevante identificado no período.";

  const negativeList = metrics.topNegativeFindings.length > 0
    ? metrics.topNegativeFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")
    : "Nenhuma não conformidade relevante identificada no período.";

  const improvements = metrics.topNonCompliances.slice(0, 5).map((nc, i) =>
    `${i + 1}. **${nc.question}** — ${nc.count} ocorrência(s) — Categoria: ${nc.category}`
  ).join("\n");

  const catComplianceTable = Object.entries(metrics.complianceByCategory)
    .sort((a, b) => a[1] - b[1])
    .map(([cat, v]) => `| ${cat} | ${v}% | ${v >= 85 ? "Adequado" : v >= 70 ? "Atenção" : "Crítico"} |`)
    .join("\n");

  const sectorComplianceTable = Object.entries(metrics.complianceBySector)
    .sort((a, b) => a[1] - b[1])
    .map(([s, v]) => `| ${s} | ${v}% | ${v >= 85 ? "Adequado" : v >= 70 ? "Atenção" : "Crítico"} |`)
    .join("\n");

  const conclusionText = generatePerformanceText(r, sectorName);
  const riskText = generateRiskAnalysisText(r, auditType, metrics.topNonCompliances);
  const causeText = generateProbableCauseText(metrics.topNonCompliances);
  const discussionText = generateResultsDiscussion(r, metrics, sectorName, auditType);
  const riskMatrixRows = generateRiskMatrixRows(metrics, auditType);
  const teamAgenda = generateTeamMeetingAgenda(metrics, sectorName);

  const trendText = metrics.trend === "Sem histórico"
    ? "Sem dados do período anterior para comparação."
    : `Tendência: **${metrics.trend}** em relação ao período anterior${metrics.previousComplianceRate !== undefined ? ` (anterior: ${metrics.previousComplianceRate}%; atual: ${r}%; variação: ${(metrics.complianceDelta ?? 0) >= 0 ? "+" : ""}${metrics.complianceDelta}%)` : ""}.`;

  const chartPlaceholder = (title: string) =>
    `> *Gráfico disponível no sistema: ${title}*`;

  const managerMsg = r < 70
    ? `Gestor(a) **${managerName || "do setor"}**, os dados deste relatório indicam situação **crítica** que requer intervenção imediata. Os pontos críticos identificados precisam ser transformados em ação prática com responsável definido, prazo estabelecido e reauditoria em até 15 dias. O objetivo é reduzir o risco assistencial e garantir a segurança dos pacientes.`
    : `Gestor(a) **${managerName || "do setor"}**, os dados deste relatório devem ser utilizados como ferramenta de gestão do setor. Os pontos identificados precisam ser transformados em ação prática, com responsável, prazo e reauditoria. O objetivo não é apenas registrar não conformidades, mas reduzir risco assistencial e melhorar a segurança do paciente.`;

  const nextGoals = r >= 95
    ? `- Manter conformidade ≥95% em todas as categorias.\n- Realizar no mínimo ${Math.max(metrics.totalAudits, 4)} auditorias no próximo ciclo.\n- Documentar boas práticas para replicação em outros setores.`
    : r >= 85
    ? `- Atingir conformidade ≥95% no próximo ciclo.\n- Reduzir as NCs identificadas em pelo menos 50%.\n- Realizar no mínimo ${Math.max(metrics.totalAudits + 2, 4)} auditorias no próximo mês.\n- Dar devolutiva individual aos profissionais com maior índice de NC.`
    : `- Atingir conformidade ≥85% no próximo ciclo como meta mínima.\n- Executar todas as ações do plano 5W2H antes da próxima auditoria.\n- Realizar reauditoria em até 30 dias.\n- Apresentar resultados em reunião de equipe com registro em ata.`;

  const recommendations = r < 70
    ? `1. **Intervenção imediata**: convocar reunião de equipe para apresentação dos resultados.\n2. Iniciar plano de ação com responsável e prazo definidos.\n3. Realizar capacitação em serviço nas categorias críticas.\n4. Reauditar em até 15 dias.\n5. Comunicar resultado à direção/coordenação para ciência e apoio.`
    : r < 85
    ? `1. Realizar devolutiva coletiva dos resultados à equipe do setor.\n2. Iniciar plano de ação nas 3 principais não conformidades.\n3. Reforçar treinamento nas categorias com desempenho < 80%.\n4. Reauditar em até 30 dias.\n5. Acompanhar evolução mensal.`
    : `1. Manter feedback periódico à equipe sobre os resultados.\n2. Focar nos pontos de melhoria identificados.\n3. Registrar e valorizar as boas práticas.\n4. Reauditar conforme calendário programado.\n5. Compartilhar resultados positivos com a direção.`;

  return `---
Instituição: ${hospitalName}
Documento: Relatório Gerencial de Auditoria
Norma: ABNT NBR 14724:2011
Código: ${code}
Versão: 1.0
Data: ${generatedAt}
Classificação: Interno
---

[LOGO DO HOSPITAL]                    [LOGO DA SCIH/CCIH]

________________________________________________________________________________

# RELATÓRIO GERENCIAL DE AUDITORIAS DO SETOR

________________________________________________________________________________

## 1. IDENTIFICAÇÃO DO DOCUMENTO

| Campo | Informação |
|---|---|
| Unidade/Hospital | ${hospitalName} |
| Setor avaliado | ${sectorName} |
| Tipo de auditoria | ${typeName} |
| Período analisado | ${periodStart} a ${periodEnd} |
| Gestor destinatário | ${managerName || "Não informado"} |
| E-mail do gestor | ${managerEmail || "Não informado"} |
| Responsável técnico | ${technicalResponsible || "CCIH/SCIH"} |
| Data de emissão | ${generatedAt} |
| Código do documento | ${code} |

________________________________________________________________________________

## 2. SUMÁRIO EXECUTIVO

No período analisado, o setor **${sectorName}** realizou **${metrics.totalAudits} auditoria(s)** de **${typeName}**, com **${metrics.totalItems} itens avaliados**. Foram identificados **${metrics.compliantItems} itens conformes** e **${metrics.nonCompliantItems} itens não conformes**, resultando em conformidade geral de **${r}%**.

O desempenho foi classificado como **${metrics.performanceClassification}**.

A principal fortaleza observada foi: **${metrics.topPositiveFindings[0] || "Conformidade em várias categorias auditadas"}**.

A principal fragilidade observada foi: **${metrics.topNonCompliances[0]?.question || "Nenhuma não conformidade crítica identificada"}**.

A prioridade de intervenção para o próximo ciclo é: **${metrics.topNonCompliances[0] ? `Reduzir NCs em "${metrics.topNonCompliances[0].question}"` : "Manter conformidade alcançada"}**.

${metrics.lowSampleAlert ? "\n> **Alerta:** Número reduzido de auditorias no período. Ampliar amostragem no próximo ciclo.\n" : ""}

________________________________________________________________________________

## 3. CONCEITO TÉCNICO DA AUDITORIA

${getAuditTechnicalConcept(auditType)}

________________________________________________________________________________

## 4. INDICADORES PRINCIPAIS

| Indicador | Resultado |
|---|---:|
| Auditorias realizadas | ${metrics.totalAudits} |
| Itens avaliados | ${metrics.totalItems} |
| Itens conformes | ${metrics.compliantItems} |
| Itens não conformes | ${metrics.nonCompliantItems} |
| Itens não aplicáveis | ${metrics.notApplicableItems} |
| Conformidade geral | ${r}% |
| Taxa de não conformidade | ${metrics.nonComplianceRate}% |
| Profissionais observados | ${metrics.totalProfessionalsObserved} |
| Auditores envolvidos | ${metrics.totalAuditors} |
| Classificação | ${metrics.performanceClassification} |
| Qualidade do registro | ${metrics.recordQuality} |

________________________________________________________________________________

## 5. DISCUSSÃO DOS RESULTADOS

${discussionText}

________________________________________________________________________________

## 6. CONFORMIDADE POR CATEGORIA

| Categoria | Conformidade | Status |
|---|---:|---|
${catComplianceTable || "| — | — | — |"}

### Discussão interpretativa das categorias

${Object.entries(metrics.complianceByCategory).filter(([, v]) => v < 70).length > 0
    ? `As categorias com conformidade abaixo de 70% exigem intervenção prioritária: **${Object.entries(metrics.complianceByCategory).filter(([, v]) => v < 70).map(([k]) => k).join(", ")}**. Esses achados indicam falha sistêmica de processo que vai além do desempenho individual e requer ação estruturada.`
    : "Todas as categorias apresentam conformidade adequada (≥70%). Manter o monitoramento contínuo."}

________________________________________________________________________________

## 7. CONFORMIDADE POR SETOR

| Setor | Conformidade | Status |
|---|---:|---|
${sectorComplianceTable || "| — | — | — |"}

________________________________________________________________________________

## 8. GRÁFICOS DO RELATÓRIO

### 8.1 Conformidade geral

${chartPlaceholder("Conformidade geral — " + typeName)}

### 8.2 Conformidade por categoria

${chartPlaceholder("Conformidade por categoria — " + sectorName)}

### 8.3 Evolução mensal

${chartPlaceholder("Evolução mensal da conformidade")}

### 8.4 Ranking das principais não conformidades

${chartPlaceholder("Ranking de não conformidades — Pareto")}

### Discussão interpretativa dos gráficos

A análise gráfica reforça os achados quantitativos: a conformidade de **${r}%** posiciona o setor como **${metrics.performanceClassification}**. ${Object.entries(metrics.complianceByCategory).filter(([, v]) => v < 70).length > 0 ? `As maiores fragilidades estão concentradas em **${Object.entries(metrics.complianceByCategory).sort((a, b) => a[1] - b[1])[0][0]}**, exigindo intervenção direcionada, feedback à equipe e reauditoria no próximo ciclo.` : "O desempenho entre categorias está equilibrado, com oportunidades pontuais de melhoria."}

________________________________________________________________________________

## 9. PONTOS POSITIVOS

${positiveList}

________________________________________________________________________________

## 10. PONTOS NEGATIVOS

${negativeList}

________________________________________________________________________________

## 11. PONTOS DE MELHORIA

### 11.1 Prioridade alta

${metrics.topNonCompliances.filter(n => n.count >= 3).length > 0
    ? metrics.topNonCompliances.filter(n => n.count >= 3).slice(0, 3).map((nc, i) => `${i + 1}. **${nc.question}** — ${nc.count} ocorrências — Categoria: ${nc.category}`).join("\n")
    : "Não há não conformidades de alta frequência no período."}

### 11.2 Prioridade média

${metrics.topNonCompliances.filter(n => n.count === 2).length > 0
    ? metrics.topNonCompliances.filter(n => n.count === 2).map((nc, i) => `${i + 1}. **${nc.question}** — ${nc.count} ocorrências`).join("\n")
    : "Nenhum ponto de melhoria de prioridade média identificado."}

### 11.3 Prioridade baixa

${metrics.topNonCompliances.filter(n => n.count === 1).length > 0
    ? metrics.topNonCompliances.filter(n => n.count === 1).slice(0, 3).map((nc, i) => `${i + 1}. ${nc.question}`).join("\n")
    : "Nenhum ponto de melhoria de prioridade baixa identificado."}

________________________________________________________________________________

## 12. PRINCIPAIS NÃO CONFORMIDADES

| Categoria | Item auditado | Nº de ocorrências | Impacto esperado |
|---|---|---:|---|
${formatTopNcRows(metrics.topNonCompliances)}

________________________________________________________________________________

## 13. ANÁLISE DE CAUSA PROVÁVEL

${causeText}

________________________________________________________________________________

## 14. RISCO ASSISTENCIAL

${riskText}

### Matriz de risco assistencial

| Risco | Evidência encontrada | Impacto possível | Prioridade |
|---|---|---|---|
${riskMatrixRows}

________________________________________________________________________________

## 15. OBSERVAÇÕES RELEVANTES DOS AUDITORES

${metrics.recordQuality === 'Insuficiente'
    ? "> **Alerta:** A maioria das não conformidades não possui observações registradas pelo auditor. Isso compromete a análise qualitativa e o plano de ação. Recomenda-se orientar os auditores a registrarem observações em todos os itens não conformes."
    : "As observações registradas pelos auditores foram incorporadas à análise. Recomenda-se manter e aprimorar o registro qualitativo de cada não conformidade."}

________________________________________________________________________________

## 16. COMPARATIVO COM PERÍODO ANTERIOR

${trendText}

${metrics.trend === "Melhorou"
    ? "O setor demonstra trajetória positiva de melhoria contínua. Manter as ações implementadas."
    : metrics.trend === "Piorou"
    ? "O resultado indica piora em relação ao período anterior. É necessário investigar as causas e reforçar as ações de melhoria."
    : metrics.trend === "Estável"
    ? "O resultado está estável, sem variação significativa. Analisar se existem ações de melhoria que possam ser implementadas para evolução."
    : ""}

________________________________________________________________________________

## 17. PLANO DE MELHORIA 5W2H

| O quê | Por quê | Onde | Quem | Quando | Como | Status |
|---|---|---|---|---|---|---|
${formatActionPlanRows(metrics.suggestedActions)}

________________________________________________________________________________

## 18. RECOMENDAÇÕES AO GESTOR DO SETOR

${recommendations}

________________________________________________________________________________

## 19. METAS PARA O PRÓXIMO CICLO

${nextGoals}

________________________________________________________________________________

## 20. PAUTA SUGERIDA PARA REUNIÃO COM EQUIPE

${teamAgenda}

________________________________________________________________________________

## 21. CONCLUSÃO

${conclusionText}

${managerMsg}

________________________________________________________________________________

## 22. CIÊNCIA DO GESTOR

| Responsável | Nome | Assinatura/Data |
|---|---|---|
| Gestor do setor | ${managerName || "_______________________"} | |
| Responsável técnico (CCIH/SCIH) | ${technicalResponsible || "_______________________"} | |
| Direção/Coordenação | _______________________ | |

________________________________________________________________________________

*Documento gerado automaticamente pelo IRAS Control em ${generatedAt}*
*Norma: ABNT NBR 14724:2011 — Classificação: Interno*
`;
}

export function generateMonthlySectorCompiledMarkdown(params: {
  hospitalName: string;
  sectorNames: string[];
  periodStart: string;
  periodEnd: string;
  managerName?: string;
  managerEmail?: string;
  technicalResponsible?: string;
  generatedAt: string;
  metrics: MonthlySectorCompiledAuditMetrics;
}): string {
  const {
    hospitalName, sectorNames, periodStart, periodEnd,
    managerName, managerEmail, technicalResponsible, generatedAt, metrics,
  } = params;

  const sectorLabel = sectorNames.join(", ");
  const r = metrics.generalComplianceRate;
  const code = `IRAS-REL-COMP-${periodStart.replace(/-/g, "").slice(0, 6)}`;

  const typeRows = Object.entries(metrics.complianceByAuditType)
    .sort((a, b) => a[1] - b[1])
    .map(([type, rate]) =>
      `| ${getAuditTypeName(type)} | ${metrics.totalAuditsByType[type] || 0} | ${rate}% | ${rate >= 85 ? "Adequado" : rate >= 70 ? "Atenção" : "Crítico"} |`
    ).join("\n");

  const worstRows = metrics.worstAuditTypes.slice(0, 5).map((t, i) =>
    `${i + 1}. **${getAuditTypeName(t.auditType)}** — ${t.complianceRate}% (${t.nonCompliantItems} NCs)`
  ).join("\n");

  const bestRows = metrics.bestAuditTypes.slice(0, 3).map(t =>
    `- **${getAuditTypeName(t.auditType)}**: ${t.complianceRate}%`
  ).join("\n");

  const positiveList = metrics.positiveFindings.length > 0
    ? metrics.positiveFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")
    : "Nenhum ponto positivo de destaque identificado no período compilado.";

  const negativeList = metrics.negativeFindings.length > 0
    ? metrics.negativeFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")
    : "Nenhuma não conformidade crítica identificada no período compilado.";

  const improvementList = metrics.improvementPriorities.length > 0
    ? metrics.improvementPriorities.map((p, i) => `${i + 1}. ${p}`).join("\n")
    : "Manter padrão atual e buscar excelência contínua.";

  const ncRows = metrics.topNonCompliances.slice(0, 10).map(n =>
    `| ${getAuditTypeName(n.auditType)} | ${n.category} | ${n.question} | ${n.count} |`
  ).join("\n");

  const actionRows = (metrics.suggestedActionPlan || []).map(a =>
    `| ${a.action} | ${a.reason} | ${sectorLabel} | ${a.responsible} | ${a.deadline} | ${a.how} | ${a.status} |`
  ).join("\n");

  const auditTypesListText = metrics.auditTypesIncluded.map(t => `- ${getAuditTypeName(t)}`).join("\n");

  const perTypeDiscussion = metrics.auditTypesIncluded.map(type => {
    const rate = metrics.complianceByAuditType[type] ?? 0;
    const nc = metrics.nonCompliancesByAuditType?.[type] ?? 0;
    const auditCount = metrics.totalAuditsByType[type] ?? 0;
    const typeName = getAuditTypeName(type);
    const concept = getAuditTechnicalConcept(type);
    return `### ${typeName}

Foram realizadas **${auditCount} auditoria(s)** de **${typeName}**, com conformidade de **${rate}%** e **${nc} item(s) não conforme(s)**.

${rate >= 85 ? `O desempenho em **${typeName}** é adequado. Manter a rotina de auditoria e feedback periódico.` : rate >= 70 ? `O desempenho em **${typeName}** requer atenção. Implementar ações de melhoria com foco nas categorias críticas.` : `O desempenho em **${typeName}** é **crítico** (${rate}%). Recomenda-se intervenção imediata, capacitação e reauditoria em até 15 dias.`}

**Conceito:** ${concept.slice(0, 200)}...`;
  }).join("\n\n---\n\n");

  const integratedDiscussion = (() => {
    const criticals = metrics.worstAuditTypes.filter(t => t.complianceRate < 70).map(t => getAuditTypeName(t.auditType));
    const attention = metrics.worstAuditTypes.filter(t => t.complianceRate >= 70 && t.complianceRate < 85).map(t => getAuditTypeName(t.auditType));
    const goods = metrics.bestAuditTypes.filter(t => t.complianceRate >= 85).map(t => getAuditTypeName(t.auditType));

    let text = `Quando analisadas em conjunto, as auditorias do setor **${sectorLabel}** no período demonstram conformidade geral de **${r}%**. `;
    if (criticals.length > 0) text += `Existem fragilidades **críticas** em: **${criticals.join(", ")}**, exigindo atuação prioritária do gestor. `;
    if (attention.length > 0) text += `Requerem **atenção**: **${attention.join(", ")}**. `;
    if (goods.length > 0) text += `Os melhores resultados foram observados em: **${goods.join(", ")}**. `;
    text += `\n\nA análise integrada sugere que o fator determinante das não conformidades no período está relacionado a: ${criticals.length > 0 ? "falha de adesão a protocolos e/ou necessidade de capacitação em serviço" : "oportunidades pontuais de melhoria nos processos assistenciais"}.`;
    return text;
  })();

  const riskMatrixRows = (() => {
    const rows: string[] = [];
    metrics.worstAuditTypes.slice(0, 3).forEach(t => {
      rows.push(`| IRAS/transmissão cruzada | NCs em ${getAuditTypeName(t.auditType)} (${t.complianceRate}%) | Aumento de infecções | ${t.complianceRate < 70 ? "ALTA" : "MÉDIA"} |`);
    });
    if (!rows.length) rows.push("| Risco controlado | Conformidade adequada em todas as auditorias | Baixo | BAIXA |");
    return rows.join("\n");
  })();

  const conclusionText = r >= 95
    ? `O setor **${sectorLabel}** apresentou desempenho **excelente** no período compilado (${r}%). Manter a vigilância e a cultura de segurança do paciente.`
    : r >= 85
    ? `O setor **${sectorLabel}** apresentou **bom desempenho** geral (${r}%). Com as ações de melhoria propostas, é possível alcançar a excelência no próximo ciclo.`
    : r >= 70
    ? `O setor **${sectorLabel}** apresentou desempenho **regular** (${r}%), indicando necessidade de plano de melhoria estruturado e acompanhamento próximo.`
    : `O setor **${sectorLabel}** apresentou desempenho **crítico** (${r}%). É necessária intervenção imediata com plano de ação, capacitação e reauditoria em curto prazo.`;

  const managerMsg = `Gestor(a) **${managerName || "do setor"}**, os dados deste relatório devem ser utilizados como ferramenta de gestão do setor. Os pontos críticos precisam ser transformados em ação prática, com responsável, prazo e reauditoria. O objetivo não é apenas registrar não conformidades, mas reduzir risco assistencial e melhorar a segurança do paciente.`;

  const nextGoals = r >= 85
    ? `- Manter conformidade ≥85% em todas as auditorias.\n- Atingir ≥95% nas auditorias com melhor desempenho.\n- Realizar todas as auditorias programadas no próximo mês.\n- Apresentar resultados em reunião com equipe.`
    : `- Atingir conformidade ≥85% no próximo ciclo.\n- Executar plano de ação 5W2H antes da próxima auditoria.\n- Realizar reauditoria nas auditorias com desempenho crítico em até 30 dias.\n- Apresentar resultados em reunião de equipe com registro em ata.`;

  return `---
Instituição: ${hospitalName}
Documento: Relatório Mensal Compilado de Auditorias do Gestor
Norma: ABNT NBR 14724:2011
Código: ${code}
Versão: 1.0
Data: ${generatedAt}
Classificação: Interno
---

[LOGO DO HOSPITAL]                    [LOGO DA SCIH/CCIH]

________________________________________________________________________________

# RELATÓRIO MENSAL COMPILADO DE AUDITORIAS DO GESTOR

________________________________________________________________________________

## 1. IDENTIFICAÇÃO DO DOCUMENTO

| Campo | Informação |
|---|---|
| Unidade/Hospital | ${hospitalName} |
| Setor(es) avaliado(s) | ${sectorLabel} |
| Período analisado | ${periodStart} a ${periodEnd} |
| Gestor destinatário | ${managerName || "Não informado"} |
| E-mail do gestor | ${managerEmail || "Não informado"} |
| Responsável técnico | ${technicalResponsible || "CCIH/SCIH"} |
| Data de emissão | ${generatedAt} |
| Código do documento | ${code} |

________________________________________________________________________________

## 2. SUMÁRIO EXECUTIVO

No período analisado, o(s) setor(es) **${sectorLabel}** realizou(aram) **${metrics.totalAudits} auditoria(s)**, distribuídas em **${metrics.totalAuditTypes} tipo(s) de auditoria**.

Foram avaliados **${metrics.totalItems} itens**, com **${metrics.compliantItems} conformes** e **${metrics.nonCompliantItems} não conformes**, resultando em conformidade geral de **${r}%**.

### Auditorias incluídas no período:

${auditTypesListText}

________________________________________________________________________________

## 3. PAINEL CONSOLIDADO DO SETOR

| Indicador | Resultado |
|---|---:|
| Total de auditorias realizadas | ${metrics.totalAudits} |
| Tipos de auditoria realizados | ${metrics.totalAuditTypes} |
| Total de itens avaliados | ${metrics.totalItems} |
| Itens conformes | ${metrics.compliantItems} |
| Itens não conformes | ${metrics.nonCompliantItems} |
| Conformidade geral do setor | ${r}% |

________________________________________________________________________________

## 4. CONFORMIDADE POR TIPO DE AUDITORIA

| Tipo de Auditoria | Nº Auditorias | Conformidade | Status |
|---|---:|---:|---|
${typeRows || "| — | — | — | — |"}

________________________________________________________________________________

## 5. RANKING DE DESEMPENHO

### Auditorias com pior desempenho:

${worstRows || "Sem dados suficientes."}

### Auditorias com melhor desempenho:

${bestRows || "Sem dados suficientes."}

________________________________________________________________________________

## 6. CONTEXTO GERAL DO SETOR

O setor **${sectorLabel}** no período de **${periodStart} a ${periodEnd}** realizou **${metrics.totalAudits} auditorias** em **${metrics.totalAuditTypes} tipos distintos**, o que demonstra ${metrics.totalAudits >= 10 ? "abrangente cobertura" : "cobertura parcial"} do processo de vigilância de práticas assistenciais. A conformidade geral de **${r}%** classifica o setor como **${r >= 95 ? "Excelente" : r >= 85 ? "Bom" : r >= 70 ? "Regular" : "Crítico"}**.

________________________________________________________________________________

## 7. DISCUSSÃO POR TIPO DE AUDITORIA

${perTypeDiscussion}

________________________________________________________________________________

## 8. DISCUSSÃO INTEGRADA DO SETOR

${integratedDiscussion}

________________________________________________________________________________

## 9. GRÁFICOS CONSOLIDADOS

> *Gráfico: Conformidade por tipo de auditoria (disponível no sistema)*

> *Gráfico: Ranking das auditorias com pior desempenho*

> *Gráfico: Principais não conformidades consolidadas*

> *Gráfico: Evolução mensal do setor*

________________________________________________________________________________

## 10. PONTOS POSITIVOS DO SETOR

${positiveList}

________________________________________________________________________________

## 11. PONTOS NEGATIVOS DO SETOR

${negativeList}

________________________________________________________________________________

## 12. PONTOS DE MELHORIA PRIORITÁRIOS

${improvementList}

________________________________________________________________________________

## 13. PRINCIPAIS NÃO CONFORMIDADES CONSOLIDADAS

| Tipo de Auditoria | Categoria | Item | Ocorrências |
|---|---|---|---:|
${ncRows || "| — | — | — | — |"}

________________________________________________________________________________

## 14. ANÁLISE DE CAUSA PROVÁVEL

${generateProbableCauseText(metrics.topNonCompliances.map(n => ({ question: n.question, category: n.category, count: n.count })))}

________________________________________________________________________________

## 15. MATRIZ DE RISCO DO SETOR

| Risco | Evidência encontrada | Impacto possível | Prioridade |
|---|---|---|---|
${riskMatrixRows}

________________________________________________________________________________

## 16. PLANO DE AÇÃO CONSOLIDADO 5W2H

| O quê | Por quê | Onde | Quem | Quando | Como | Status |
|---|---|---|---|---|---|---|
${actionRows || "| — | — | — | — | — | — | — |"}

________________________________________________________________________________

## 17. RECOMENDAÇÕES AO GESTOR

1. Apresentar os resultados consolidados à equipe do setor em reunião formal.
2. Priorizar as ações de melhoria nas auditorias com desempenho crítico.
3. Definir responsáveis e prazos para cada ação do plano 5W2H.
4. Realizar reauditoria nas áreas críticas em até 30 dias.
5. Manter o calendário de auditorias programadas para o próximo mês.
6. Registrar ata de ciência da equipe.

________________________________________________________________________________

## 18. METAS PARA O PRÓXIMO MÊS

${nextGoals}

________________________________________________________________________________

## 19. PAUTA SUGERIDA PARA REUNIÃO COM EQUIPE

1. Apresentar resultado geral do mês (conformidade de ${r}%).
2. Discutir auditorias com pior desempenho: ${metrics.worstAuditTypes.slice(0, 2).map(t => getAuditTypeName(t.auditType)).join(", ") || "a definir"}.
3. Discutir principais não conformidades: ${metrics.topNonCompliances.slice(0, 2).map(n => `"${n.question}"`).join("; ") || "a definir"}.
4. Definir responsáveis pelo plano de ação.
5. Definir prazo de reauditoria.
6. Registrar ciência da equipe.

________________________________________________________________________________

## 20. CONCLUSÃO

${conclusionText}

${managerMsg}

________________________________________________________________________________

## 21. CIÊNCIA DO GESTOR

| Responsável | Nome | Assinatura/Data |
|---|---|---|
| Gestor do setor | ${managerName || "_______________________"} | |
| Responsável técnico (CCIH/SCIH) | ${technicalResponsible || "_______________________"} | |
| Direção/Coordenação | _______________________ | |

________________________________________________________________________________

*Documento gerado automaticamente pelo IRAS Control em ${generatedAt}*
*Norma: ABNT NBR 14724:2011 — Classificação: Interno*
`;
}
