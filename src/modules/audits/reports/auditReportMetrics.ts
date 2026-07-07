import type {
  AuditRecord, AuditItemRecord, AuditManagerReportMetrics,
  MonthlySectorCompiledAuditMetrics, AuditActionPlanRecord,
} from "./auditReportTypes";

function classifyPerformance(rate: number): 'Excelente' | 'Bom' | 'Regular' | 'Crítico' {
  if (rate >= 95) return 'Excelente';
  if (rate >= 85) return 'Bom';
  if (rate >= 70) return 'Regular';
  return 'Crítico';
}

function calcStatusColor(rate: number): 'verde' | 'amarelo' | 'vermelho' {
  if (rate >= 85) return 'verde';
  if (rate >= 70) return 'amarelo';
  return 'vermelho';
}

export function calculateAuditManagerReportMetrics(params: {
  audits: AuditRecord[];
  items: AuditItemRecord[];
  previousPeriodAudits?: AuditRecord[];
  previousPeriodItems?: AuditItemRecord[];
}): AuditManagerReportMetrics {
  const { audits, items, previousPeriodAudits } = params;

  const totalItems = items.length;
  const compliantItems = items.filter(i => i.status === 'compliant').length;
  const nonCompliantItems = items.filter(i => i.status === 'non_compliant').length;
  const notApplicableItems = items.filter(i => i.status === 'not_applicable').length;

  const evaluated = compliantItems + nonCompliantItems;
  const generalComplianceRate = evaluated > 0 ? Math.round((compliantItems / evaluated) * 1000) / 10 : 0;
  const nonComplianceRate = evaluated > 0 ? Math.round((nonCompliantItems / evaluated) * 1000) / 10 : 0;

  // Conformidade por categoria
  const catMap: Record<string, { c: number; t: number }> = {};
  items.forEach(i => {
    const cat = i.category || "Geral";
    if (!catMap[cat]) catMap[cat] = { c: 0, t: 0 };
    if (i.status === 'compliant' || i.status === 'non_compliant') {
      catMap[cat].t++;
      if (i.status === 'compliant') catMap[cat].c++;
    }
  });
  const complianceByCategory: Record<string, number> = {};
  Object.entries(catMap).forEach(([cat, v]) => {
    complianceByCategory[cat] = v.t > 0 ? Math.round((v.c / v.t) * 100) : 0;
  });

  // Conformidade por setor
  const sectorMap: Record<string, { sum: number; count: number }> = {};
  audits.forEach(a => {
    const s = a.sector || "Sem setor";
    if (!sectorMap[s]) sectorMap[s] = { sum: 0, count: 0 };
    sectorMap[s].sum += a.compliance_rate || 0;
    sectorMap[s].count++;
  });
  const complianceBySector: Record<string, number> = {};
  Object.entries(sectorMap).forEach(([s, v]) => {
    complianceBySector[s] = v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0;
  });

  // Top não conformidades
  const ncMap: Record<string, { category: string; question: string; count: number }> = {};
  items.filter(i => i.status === 'non_compliant').forEach(i => {
    const key = `${i.category}||${i.question}`;
    if (!ncMap[key]) ncMap[key] = { category: i.category || "Geral", question: i.question, count: 0 };
    ncMap[key].count++;
  });
  const topNonCompliances = Object.values(ncMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(n => ({ ...n, rate: evaluated > 0 ? Math.round((n.count / evaluated) * 100) : 0 }));

  // Top positivos
  const confMap: Record<string, number> = {};
  items.filter(i => i.status === 'compliant').forEach(i => {
    confMap[i.question] = (confMap[i.question] || 0) + 1;
  });
  const topPositiveFindings = Object.entries(confMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([q]) => q);

  const topNegativeFindings = topNonCompliances.slice(0, 5).map(n => n.question);

  // Conformidade por questão
  const qMap: Record<string, { c: number; t: number }> = {};
  items.forEach(i => {
    if (!qMap[i.question]) qMap[i.question] = { c: 0, t: 0 };
    if (i.status === 'compliant' || i.status === 'non_compliant') {
      qMap[i.question].t++;
      if (i.status === 'compliant') qMap[i.question].c++;
    }
  });
  const complianceByQuestion: Record<string, number> = {};
  Object.entries(qMap).forEach(([q, v]) => {
    complianceByQuestion[q] = v.t > 0 ? Math.round((v.c / v.t) * 100) : 0;
  });

  // Conformidade por categoria profissional
  const profMap: Record<string, { sum: number; count: number }> = {};
  audits.forEach(a => {
    if (!a.observations) return;
    const m = a.observations.match(/Categoria:\s*([^|;\n]+)/i);
    const cat = m?.[1]?.trim() || "Não informado";
    if (!profMap[cat]) profMap[cat] = { sum: 0, count: 0 };
    profMap[cat].sum += a.compliance_rate || 0;
    profMap[cat].count++;
  });
  const complianceByProfessionalCategory: Record<string, number> = {};
  Object.entries(profMap).forEach(([cat, v]) => {
    complianceByProfessionalCategory[cat] = v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0;
  });

  // Auditorias por auditor
  const auditorMap: Record<string, number> = {};
  audits.forEach(a => {
    if (!a.observations) return;
    const m = a.observations.match(/Auditor:\s*([^|;\n]+)/i);
    const auditor = m?.[1]?.trim() || "Não informado";
    auditorMap[auditor] = (auditorMap[auditor] || 0) + 1;
  });

  // Tendência
  let trend: AuditManagerReportMetrics['trend'] = 'Sem histórico';
  let previousComplianceRate: number | undefined;
  let complianceDelta: number | undefined;
  if (previousPeriodAudits && previousPeriodAudits.length > 0) {
    const prevAvg = previousPeriodAudits.reduce((s, a) => s + (a.compliance_rate || 0), 0) / previousPeriodAudits.length;
    previousComplianceRate = Math.round(prevAvg * 10) / 10;
    complianceDelta = Math.round((generalComplianceRate - previousComplianceRate) * 10) / 10;
    trend = complianceDelta > 2 ? 'Melhorou' : complianceDelta < -2 ? 'Piorou' : 'Estável';
  }

  // Qualidade do registro
  const withObs = items.filter(i => i.status === 'non_compliant' && i.observation).length;
  const obsRate = nonCompliantItems > 0 ? withObs / nonCompliantItems : 1;
  const recordQuality: 'Boa' | 'Regular' | 'Insuficiente' =
    obsRate >= 0.7 ? 'Boa' : obsRate >= 0.4 ? 'Regular' : 'Insuficiente';

  // Plano de ação sugerido
  const prazoBase = new Date();
  prazoBase.setDate(prazoBase.getDate() + 30);
  const deadline = prazoBase.toISOString().slice(0, 10);
  const suggestedActions: AuditActionPlanRecord[] = topNonCompliances.slice(0, 3).map(nc => ({
    action: `Reforçar conformidade: ${nc.question.slice(0, 60)}`,
    reason: `NC identificada ${nc.count}× — impacto direto na segurança do paciente`,
    responsible: "Gestor do setor + CCIH",
    deadline,
    how: "Treinamento em serviço, feedback à equipe e reauditoria no próximo ciclo",
    status: 'sugerido' as const,
  }));

  return {
    totalAudits: audits.length,
    totalItems,
    compliantItems,
    nonCompliantItems,
    notApplicableItems,
    generalComplianceRate,
    nonComplianceRate,
    totalProfessionalsObserved: audits.length,
    totalAuditors: Math.max(1, Object.keys(auditorMap).filter(k => k !== "Não informado").length),
    performanceClassification: classifyPerformance(generalComplianceRate),
    statusColor: calcStatusColor(generalComplianceRate),
    complianceBySector,
    complianceByCategory,
    complianceByQuestion,
    complianceByProfessionalCategory,
    auditsByAuditor: auditorMap,
    topPositiveFindings,
    topNegativeFindings,
    topNonCompliances,
    recurrentNonCompliances: topNonCompliances.filter(n => n.count > 1).map(n => n.question),
    trend,
    previousComplianceRate,
    complianceDelta,
    lowSampleAlert: audits.length < 3,
    recordQuality,
    suggestedActions,
  };
}

export function calculateMonthlySectorCompiledAuditReport(params: {
  audits: AuditRecord[];
  items: AuditItemRecord[];
}): MonthlySectorCompiledAuditMetrics {
  const { audits, items } = params;

  const totalItems = items.length;
  const compliantItems = items.filter(i => i.status === 'compliant').length;
  const nonCompliantItems = items.filter(i => i.status === 'non_compliant').length;
  const evaluated = compliantItems + nonCompliantItems;
  const generalComplianceRate = evaluated > 0 ? Math.round((compliantItems / evaluated) * 1000) / 10 : 0;

  // Por tipo de auditoria
  const typeMap: Record<string, { audits: AuditRecord[]; items: AuditItemRecord[] }> = {};
  audits.forEach(a => {
    const t = a.audit_type;
    if (!typeMap[t]) typeMap[t] = { audits: [], items: [] };
    typeMap[t].audits.push(a);
  });
  items.forEach(i => {
    const audit = audits.find(a => a.id === i.audit_id);
    if (!audit || !typeMap[audit.audit_type]) return;
    typeMap[audit.audit_type].items.push(i);
  });

  const complianceByAuditType: Record<string, number> = {};
  const totalAuditsByType: Record<string, number> = {};
  const nonCompliancesByAuditType: Record<string, number> = {};

  Object.entries(typeMap).forEach(([type, data]) => {
    totalAuditsByType[type] = data.audits.length;
    const c = data.items.filter(i => i.status === 'compliant').length;
    const nc = data.items.filter(i => i.status === 'non_compliant').length;
    const ev = c + nc;
    complianceByAuditType[type] = ev > 0 ? Math.round((c / ev) * 1000) / 10 : 0;
    nonCompliancesByAuditType[type] = nc;
  });

  const worstAuditTypes = Object.entries(complianceByAuditType)
    .map(([auditType, complianceRate]) => ({
      auditType,
      complianceRate,
      nonCompliantItems: nonCompliancesByAuditType[auditType] || 0,
    }))
    .sort((a, b) => a.complianceRate - b.complianceRate);

  const bestAuditTypes = [...worstAuditTypes].reverse().slice(0, 3);

  // Top NCs por tipo
  const ncMap: Record<string, { auditType: string; category: string; question: string; count: number }> = {};
  items.filter(i => i.status === 'non_compliant').forEach(i => {
    const audit = audits.find(a => a.id === i.audit_id);
    const key = `${audit?.audit_type}||${i.category}||${i.question}`;
    if (!ncMap[key]) ncMap[key] = {
      auditType: audit?.audit_type || "",
      category: i.category || "Geral",
      question: i.question,
      count: 0,
    };
    ncMap[key].count++;
  });
  const topNonCompliances = Object.values(ncMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Positive findings
  const confMap: Record<string, number> = {};
  items.filter(i => i.status === 'compliant').forEach(i => {
    confMap[i.question] = (confMap[i.question] || 0) + 1;
  });
  const positiveFindings = Object.entries(confMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([q]) => q);

  const negativeFindings = topNonCompliances.slice(0, 5).map(n => n.question);

  const improvementPriorities = worstAuditTypes.slice(0, 3).map(t =>
    `${t.auditType}: conformidade de ${t.complianceRate}% — requer intervenção prioritária`
  );

  const prazo = new Date();
  prazo.setDate(prazo.getDate() + 30);
  const deadline = prazo.toISOString().slice(0, 10);
  const suggestedActionPlan: AuditActionPlanRecord[] = topNonCompliances.slice(0, 3).map(nc => ({
    action: `Corrigir NC: ${nc.question.slice(0, 50)}`,
    reason: `NC recorrente em ${nc.auditType} — risco assistencial`,
    responsible: "Gestor + CCIH",
    deadline,
    how: "Treinamento, feedback e reauditoria",
    status: 'sugerido' as const,
  }));

  return {
    totalAudits: audits.length,
    totalAuditTypes: Object.keys(typeMap).length,
    auditTypesIncluded: Object.keys(typeMap),
    totalItems,
    compliantItems,
    nonCompliantItems,
    generalComplianceRate,
    complianceByAuditType,
    totalAuditsByType,
    nonCompliancesByAuditType,
    worstAuditTypes,
    bestAuditTypes,
    topNonCompliances,
    positiveFindings,
    negativeFindings,
    improvementPriorities,
    suggestedActionPlan,
  };
}
