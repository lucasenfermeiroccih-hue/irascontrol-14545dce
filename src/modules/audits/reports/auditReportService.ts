import { supabase } from "@/integrations/supabase/client";
import type {
  AuditRecord,
  AuditItemRecord,
  HospitalLogo,
  AuditManagerReportMetrics,
  MonthlySectorCompiledAuditMetrics,
  AuditReportMode,
} from "./auditReportTypes";
import { getAuditTypeName } from "./auditReportMarkdown";

export async function fetchAuditsForReport(params: {
  hospitalId: string;
  sectors: string[];
  periodStart: string;
  periodEnd: string;
  auditType?: string;
}): Promise<{ audits: AuditRecord[]; items: AuditItemRecord[] }> {
  let query = supabase
    .from("audits")
    .select("id, audit_date, audit_type, sector, compliance_rate, compliant_items, total_items, observations, hospital_id")
    .eq("hospital_id", params.hospitalId)
    .gte("audit_date", params.periodStart)
    .lte("audit_date", params.periodEnd)
    .order("audit_date", { ascending: false });

  if (params.auditType) {
    query = (query as any).eq("audit_type", params.auditType);
  }

  const { data: auditData } = await query;
  let audits = (auditData || []) as AuditRecord[];

  if (params.sectors.length > 0) {
    audits = audits.filter(a => params.sectors.includes(a.sector || ""));
  }

  if (audits.length === 0) return { audits, items: [] };

  const ids = audits.map(a => a.id);
  const allItems: AuditItemRecord[] = [];
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("audit_items")
        .select("id, audit_id, question, status, category, observation, item_order")
        .in("audit_id", chunk)
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      allItems.push(...(data as AuditItemRecord[]));
      if (data.length < 1000) break;
      from += 1000;
    }
  }

  return { audits, items: allItems };
}

export async function fetchHospitalLogos(hospitalId: string): Promise<HospitalLogo[]> {
  const { data } = await supabase
    .from("hospital_logos" as never)
    .select("logo_type, storage_path, display_name")
    .eq("hospital_id", hospitalId)
    .order("display_order");

  const rows = (data as { logo_type: string; storage_path: string; display_name: string | null }[] | null) ?? [];
  return rows.map(l => ({
    ...l,
    url: supabase.storage.from("hospital-logos").getPublicUrl(l.storage_path).data.publicUrl,
  }));
}

export async function fetchAvailableSectors(hospitalId: string): Promise<string[]> {
  const { data } = await supabase
    .from("audits")
    .select("sector")
    .eq("hospital_id", hospitalId)
    .not("sector", "is", null);

  const sectors = [...new Set((data || []).map((a: any) => a.sector as string).filter(Boolean))];
  return sectors.sort();
}

export interface AIReportSections {
  summaryExecutive: string;
  resultsDiscussion: string;
  chartDiscussions: string;
  probableCauseAnalysis: string;
  riskAnalysis: string;
  managerRecommendations: string;
  nextCycleGoals: string;
  conclusion: string;
  integratedSectorDiscussion: string;
  teamMeetingAgenda: string;
}

function buildLocalFallbackSections(
  metrics: AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics,
  auditTypeName: string,
  sectorName: string,
  mode: AuditReportMode
): AIReportSections {
  const r = metrics.generalComplianceRate;
  const cls = r >= 95 ? "excelente" : r >= 85 ? "bom" : r >= 70 ? "regular" : "crítico";
  const totalAudits = metrics.totalAudits;
  const totalItems = metrics.totalItems;
  const compliant = metrics.compliantItems;
  const nc = metrics.nonCompliantItems;

  const topNCs = 'topNonCompliances' in metrics ? metrics.topNonCompliances : [];
  const topNCText = topNCs.slice(0, 3).map((n: any) => `"${n.question}" (${n.count}×)`).join("; ");

  return {
    summaryExecutive: `No período analisado, o setor **${sectorName}** realizou **${totalAudits}** auditoria(s) de **${auditTypeName}**, totalizando **${totalItems}** itens avaliados. Foram identificados **${compliant}** itens conformes e **${nc}** não conformes, resultando em conformidade geral de **${r}%**, classificada como **${cls}**.\n\nA análise dos resultados evidencia ${r >= 85 ? "bom desempenho geral, com oportunidades pontuais de melhoria" : "necessidade de intervenção estruturada para elevar o nível de conformidade"}. As principais fragilidades estão concentradas nas não conformidades mais frequentes identificadas no período.`,
    resultsDiscussion: `Os resultados das auditorias de **${auditTypeName}** no setor **${sectorName}** revelam conformidade de **${r}%**, posicionando o setor na classificação **${cls}**. ${topNCText ? `As principais não conformidades foram: ${topNCText}.` : ""} A análise por categoria demonstra variação no desempenho entre os diferentes aspectos auditados, indicando a necessidade de abordagem diferenciada por área.`,
    chartDiscussions: `A análise gráfica confirma os achados quantitativos. A conformidade de **${r}%** ${r < 70 ? "está abaixo do mínimo aceitável (70%)" : r < 85 ? "está na faixa de atenção (70-85%)" : "está na faixa adequada (≥85%)"}. O ranking das não conformidades permite priorizar as ações de melhoria com base na frequência e impacto de cada item.`,
    probableCauseAnalysis: `As causas prováveis das não conformidades identificadas estão relacionadas a: (1) adesão incompleta aos protocolos institucionais; (2) necessidade de reforço de treinamento e capacitação em serviço; (3) possíveis barreiras estruturais ou de processo que dificultam a execução correta dos procedimentos. Recomenda-se análise de causa-raiz com a equipe para identificação e tratamento específico de cada causa.`,
    riskAnalysis: `A conformidade de **${r}%** em **${auditTypeName}** representa risco assistencial **${r < 70 ? "ALTO" : r < 85 ? "MODERADO" : "BAIXO"}**. ${r < 70 ? "Existe risco relevante de eventos adversos relacionados às não conformidades identificadas. Intervenção imediata é necessária." : r < 85 ? "O risco é controlável com as ações de melhoria propostas e acompanhamento próximo." : "O risco está controlado. Manter vigilância contínua."}`,
    managerRecommendations: `1. ${r < 70 ? "Convocar reunião imediata de equipe para apresentação dos resultados" : "Realizar devolutiva dos resultados à equipe do setor"}.\n2. Iniciar plano de ação nas principais não conformidades identificadas.\n3. Definir responsáveis e prazos para cada ação de melhoria.\n4. Realizar reauditoria em ${r < 70 ? "15" : "30"} dias para verificar evolução.\n5. Documentar e comunicar os resultados à direção/coordenação.`,
    nextCycleGoals: `- Atingir conformidade ≥${r >= 85 ? "95" : "85"}% no próximo ciclo.\n- Realizar no mínimo ${Math.max(totalAudits + 2, 4)} auditorias no próximo mês.\n- Reduzir as principais não conformidades em pelo menos 50%.\n- Apresentar resultados em reunião de equipe com registro em ata.`,
    conclusion: `O setor **${sectorName}** apresentou desempenho **${cls}** no período (${r}%). ${r >= 85 ? "Os resultados indicam boa adesão às práticas auditadas. Manter a rotina de vigilância e auditoria periódica." : "Existe necessidade de plano de ação estruturado, acompanhamento próximo e reauditoria para elevação do nível de conformidade e redução do risco assistencial."}`,
    integratedSectorDiscussion: mode === 'monthly_sector_compiled'
      ? `A análise integrada das auditorias do período demonstra conformidade geral de **${r}%**. Os diferentes tipos de auditoria realizados permitem uma visão abrangente das práticas assistenciais do setor, identificando áreas de fortaleza e oportunidades de melhoria que devem ser priorizadas no próximo ciclo.`
      : "",
    teamMeetingAgenda: `1. Apresentação dos resultados de auditoria do período (conformidade: ${r}%).\n2. Discussão das principais não conformidades identificadas.\n3. Definição de responsáveis pelo plano de ação.\n4. Estabelecimento de prazo de reauditoria.\n5. Registro de ciência e comprometimento da equipe.`,
  };
}

export async function generateAIReportSections(params: {
  metrics: AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics;
  auditTypeName: string;
  sectorName: string;
  period: string;
  mode: AuditReportMode;
}): Promise<AIReportSections> {
  const { metrics, auditTypeName, sectorName, period, mode } = params;
  const r = metrics.generalComplianceRate;
  const topNCs = 'topNonCompliances' in metrics ? metrics.topNonCompliances : [];
  const topNCText = topNCs.slice(0, 5).map((n: any) => `"${n.question}" (${n.count}×)`).join(", ");

  const compByCat = 'complianceByCategory' in metrics ? metrics.complianceByCategory : {};
  const worstCats = Object.entries(compByCat).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k, v]) => `${k}: ${v}%`).join(", ");
  const bestCats = Object.entries(compByCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}: ${v}%`).join(", ");

  const compiledExtra = mode === 'monthly_sector_compiled' && 'auditTypesIncluded' in metrics
    ? `- Tipos de auditoria: ${(metrics.auditTypesIncluded as string[]).map(getAuditTypeName).join(", ")}\n- Conformidade por tipo: ${Object.entries(metrics.complianceByAuditType ?? {}).map(([k, v]) => `${getAuditTypeName(k)}: ${v}%`).join(", ")}`
    : "";

  const prompt = `Você é especialista em controle de infecção hospitalar e deve gerar as seções textuais de um relatório gerencial de auditoria (norma ABNT NBR 14724:2011). Use linguagem gerencial técnica, objetiva e em português do Brasil.

DADOS DAS AUDITORIAS:
- Tipo de auditoria: ${auditTypeName}
- Setor(es): ${sectorName}
- Período: ${period}
- Total de auditorias: ${metrics.totalAudits}
- Total de itens avaliados: ${metrics.totalItems}
- Itens conformes: ${metrics.compliantItems}
- Itens não conformes: ${metrics.nonCompliantItems}
- Conformidade geral: ${r}%
- Classificação: ${r >= 95 ? "Excelente" : r >= 85 ? "Bom" : r >= 70 ? "Regular" : "Crítico"}
- Principais não conformidades: ${topNCText || "Nenhuma"}
- Categorias com pior desempenho: ${worstCats || "N/A"}
- Categorias com melhor desempenho: ${bestCats || "N/A"}
${compiledExtra}

Gere as seguintes seções separadas por "===SECAO:nome===":

===SECAO:sumario_executivo===
[Sumário executivo de 3-4 parágrafos, cite os números, linguagem gerencial]

===SECAO:discussao_resultados===
[Discussão técnica dos resultados de 3-5 parágrafos, interprete os dados, cite riscos assistenciais]

===SECAO:discussao_graficos===
[Interpretação dos gráficos de conformidade, mencione categorias específicas, 2-3 parágrafos]

===SECAO:analise_causas===
[Análise das causas prováveis das não conformidades, 2-3 parágrafos]

===SECAO:analise_risco===
[Leitura do risco assistencial baseada nos achados, 2 parágrafos]

===SECAO:recomendacoes===
[6-8 recomendações práticas numeradas ao gestor]

===SECAO:metas===
[4-5 metas mensuráveis para o próximo ciclo, formato de lista]

===SECAO:conclusao===
[Conclusão técnica com decisão clara, 2-3 parágrafos]

===SECAO:discussao_integrada===
[Discussão integrada dos achados — preencher apenas se modo compilado, senão deixar em branco]

===SECAO:pauta_reuniao===
[Pauta sugerida para reunião com equipe, formato de lista numerada, 5-7 itens]`;

  function parseSections(text: string): AIReportSections {
    const sections: Record<string, string> = {};
    const parts = text.split(/===SECAO:(\w+)===/);
    for (let i = 1; i < parts.length; i += 2) {
      sections[parts[i]] = (parts[i + 1] || "").trim();
    }
    const fallback = buildLocalFallbackSections(metrics, auditTypeName, sectorName, mode);
    return {
      summaryExecutive: sections.sumario_executivo || fallback.summaryExecutive,
      resultsDiscussion: sections.discussao_resultados || fallback.resultsDiscussion,
      chartDiscussions: sections.discussao_graficos || fallback.chartDiscussions,
      probableCauseAnalysis: sections.analise_causas || fallback.probableCauseAnalysis,
      riskAnalysis: sections.analise_risco || fallback.riskAnalysis,
      managerRecommendations: sections.recomendacoes || fallback.managerRecommendations,
      nextCycleGoals: sections.metas || fallback.nextCycleGoals,
      conclusion: sections.conclusao || fallback.conclusion,
      integratedSectorDiscussion: sections.discussao_integrada || fallback.integratedSectorDiscussion,
      teamMeetingAgenda: sections.pauta_reuniao || fallback.teamMeetingAgenda,
    };
  }

  // 1. Try agent-chat
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const { data, error } = await supabase.functions.invoke("agent-chat", {
      body: {
        agent_id: "gerador-de-relatorios",
        input: prompt,
        context: { mode, sectorName, auditTypeName, compliance: r },
      },
    });
    clearTimeout(timer);
    if (!error && data?.output && data.output.length > 100) {
      return parseSections(data.output);
    }
  } catch (_) {
    // ignore, try next
  }

  // 2. Try generate-insights
  try {
    const { data, error } = await supabase.functions.invoke("generate-insights", {
      body: {
        context: prompt,
        pageTitle: `Relatório Gerencial de Auditoria — ${auditTypeName} — ${sectorName}`,
      },
    });
    if (!error && data?.insights && Array.isArray(data.insights) && data.insights.length > 0) {
      const text = data.insights.join("\n\n");
      if (text.includes("===SECAO:")) return parseSections(text);
      const fallback = buildLocalFallbackSections(metrics, auditTypeName, sectorName, mode);
      return { ...fallback, resultsDiscussion: text };
    }
  } catch (_) {
    // ignore
  }

  // 3. Local fallback
  return buildLocalFallbackSections(metrics, auditTypeName, sectorName, mode);
}
