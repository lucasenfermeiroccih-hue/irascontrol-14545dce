interface ClinicaStats {
  name: string;
  cirurgias: number;
  isc: number;
  reinternacoes: number;
  contatos: number;
  taxaISC: number;
  taxaResposta: number;
}

interface TrendPoint {
  periodo: string;
  taxa: number;
}

interface ReportInput {
  totalCirurgias: number;
  totalContatos: number;
  taxaResposta: number;
  totalReinternacoes: number;
  totalISC: number;
  taxaISC: number;
  clinicas: ClinicaStats[];
  tendencia: TrendPoint[];
  promptExtra?: string;
}

export interface SmartInsight {
  icon: "award" | "alert" | "activity" | "phone" | "stethoscope" | "trending-down" | "trending-up";
  text: string;
  type: "success" | "warning" | "danger";
}

export function generateSmartInsights(input: ReportInput): SmartInsight[] {
  const msgs: SmartInsight[] = [];
  const { taxaISC, taxaResposta, totalReinternacoes, totalCirurgias, clinicas, tendencia } = input;

  // ISC rate assessment
  if (taxaISC <= 2) msgs.push({ icon: "award", text: `Taxa de ISC em ${taxaISC.toFixed(1)}% — Excelente desempenho! Meta atingida.`, type: "success" });
  else if (taxaISC > 5) msgs.push({ icon: "alert", text: `Taxa de ISC em ${taxaISC.toFixed(1)}% — Acima do limite aceitável. Investigar causas imediatamente.`, type: "danger" });
  else msgs.push({ icon: "activity", text: `Taxa de ISC em ${taxaISC.toFixed(1)}% — Dentro da faixa de atenção. Monitorar tendência.`, type: "warning" });

  // Response rate
  if (taxaResposta < 40) msgs.push({ icon: "phone", text: `Taxa de resposta de contatos em ${taxaResposta.toFixed(1)}% — Crítica. Revisar processo de busca ativa e contato telefônico.`, type: "danger" });
  else if (taxaResposta < 60) msgs.push({ icon: "phone", text: `Taxa de resposta em ${taxaResposta.toFixed(1)}% — Abaixo do ideal. Considerar múltiplas tentativas e horários alternativos.`, type: "warning" });
  else msgs.push({ icon: "phone", text: `Taxa de resposta em ${taxaResposta.toFixed(1)}% — Boa adesão ao follow-up pós-operatório.`, type: "success" });

  // Best and worst clinics
  const clinicasComCirurgia = clinicas.filter((c) => c.cirurgias > 0);
  if (clinicasComCirurgia.length > 1) {
    const best = clinicasComCirurgia.reduce((a, b) => a.taxaISC < b.taxaISC ? a : b);
    const worst = clinicasComCirurgia.reduce((a, b) => a.taxaISC > b.taxaISC ? a : b);
    if (best.name !== worst.name) {
      msgs.push({ icon: "award", text: `${best.name} apresenta a menor taxa de ISC (${best.taxaISC.toFixed(1)}%) — melhor desempenho entre as clínicas.`, type: "success" });
      if (worst.taxaISC > 5) {
        msgs.push({ icon: "alert", text: `${worst.name} apresenta a maior taxa de ISC (${worst.taxaISC.toFixed(1)}%) — requer atenção prioritária.`, type: "danger" });
      } else if (worst.taxaISC > 2) {
        msgs.push({ icon: "activity", text: `${worst.name} tem a maior taxa de ISC relativa (${worst.taxaISC.toFixed(1)}%) — monitorar evolução.`, type: "warning" });
      }
    }
  }

  // Readmission rate
  if (totalCirurgias > 0) {
    const taxaReint = (totalReinternacoes / totalCirurgias) * 100;
    if (taxaReint > 10) msgs.push({ icon: "alert", text: `Taxa de reinternação em ${taxaReint.toFixed(1)}% — valor elevado, investigar causas.`, type: "danger" });
    else if (taxaReint > 5) msgs.push({ icon: "activity", text: `Taxa de reinternação em ${taxaReint.toFixed(1)}% — dentro do esperado mas requer monitoramento.`, type: "warning" });
  }

  // Trend analysis
  if (tendencia.length >= 3) {
    const last3 = tendencia.slice(-3);
    const increasing = last3[2].taxa > last3[0].taxa && last3[1].taxa > last3[0].taxa;
    const decreasing = last3[2].taxa < last3[0].taxa && last3[1].taxa < last3[0].taxa;
    if (increasing) msgs.push({ icon: "trending-up", text: `Tendência de aumento na taxa de ISC nos últimos 3 períodos (${last3.map((t) => t.taxa + "%").join(" → ")}). Atenção redobrada.`, type: "danger" });
    else if (decreasing) msgs.push({ icon: "trending-down", text: `Tendência de redução na taxa de ISC nos últimos 3 períodos (${last3.map((t) => t.taxa + "%").join(" → ")}). Bom progresso!`, type: "success" });
  }

  // Highest volume
  const highest = clinicasComCirurgia.reduce((a, b) => a.cirurgias > b.cirurgias ? a : b, { name: "", cirurgias: 0 } as ClinicaStats);
  if (highest.name) msgs.push({ icon: "stethoscope", text: `${highest.name} concentra o maior volume cirúrgico (${highest.cirurgias} procedimentos no período).`, type: "success" });

  return msgs;
}

export function generateStructuredReport(input: ReportInput): string {
  const { totalCirurgias, totalContatos, taxaResposta, totalReinternacoes, totalISC, taxaISC, clinicas, tendencia, promptExtra } = input;
  const clinicasComCirurgia = clinicas.filter((c) => c.cirurgias > 0);

  // --- Resumo Geral ---
  let report = `📊 RELATÓRIO ISC — ANÁLISE DO PERÍODO\n${"═".repeat(45)}\n\n`;
  report += `📋 RESUMO GERAL\n`;
  report += `• Total de procedimentos cirúrgicos: ${totalCirurgias}\n`;
  report += `• Contatos telefônicos atendidos: ${totalContatos} (taxa: ${taxaResposta.toFixed(1)}%)\n`;
  report += `• ISC confirmadas: ${totalISC} (taxa geral: ${taxaISC.toFixed(1)}%)\n`;
  report += `• Reinternações: ${totalReinternacoes}\n`;

  if (clinicasComCirurgia.length > 0) {
    report += `\n📊 DESEMPENHO POR CLÍNICA\n`;
    for (const c of clinicasComCirurgia) {
      const status = c.taxaISC <= 2 ? "✅" : c.taxaISC <= 5 ? "⚠️" : "🔴";
      report += `${status} ${c.name}: ${c.cirurgias} cirurgias, ${c.isc} ISC (${c.taxaISC.toFixed(1)}%), ${c.reinternacoes} reinternações\n`;
    }
  }

  // --- Pontos de Atenção ---
  const alertas: string[] = [];
  if (taxaISC > 5) alertas.push(`Taxa geral de ISC (${taxaISC.toFixed(1)}%) acima do limite aceitável de 5%.`);
  if (taxaResposta < 60) alertas.push(`Taxa de resposta ao follow-up (${taxaResposta.toFixed(1)}%) abaixo da meta de 60%.`);
  clinicasComCirurgia.filter((c) => c.taxaISC > 5).forEach((c) => alertas.push(`${c.name} com taxa de ISC elevada: ${c.taxaISC.toFixed(1)}%.`));
  if (totalCirurgias > 0 && (totalReinternacoes / totalCirurgias) * 100 > 10) alertas.push(`Taxa de reinternação elevada: ${((totalReinternacoes / totalCirurgias) * 100).toFixed(1)}%.`);

  if (tendencia.length >= 3) {
    const last3 = tendencia.slice(-3);
    if (last3[2].taxa > last3[0].taxa && last3[1].taxa > last3[0].taxa) {
      alertas.push(`Tendência de aumento na taxa de ISC: ${last3.map((t) => t.taxa + "%").join(" → ")}.`);
    }
  }

  if (alertas.length > 0) {
    report += `\n⚠️ PONTOS DE ATENÇÃO\n`;
    alertas.forEach((a) => { report += `• ${a}\n`; });
  }

  // --- Destaques Positivos ---
  const destaques: string[] = [];
  if (taxaISC <= 2) destaques.push(`Taxa geral de ISC em ${taxaISC.toFixed(1)}% — meta atingida com excelência.`);
  if (taxaResposta >= 80) destaques.push(`Alta adesão ao follow-up telefônico: ${taxaResposta.toFixed(1)}%.`);
  clinicasComCirurgia.filter((c) => c.taxaISC <= 2 && c.cirurgias > 0).forEach((c) => destaques.push(`${c.name} com taxa de ISC exemplar: ${c.taxaISC.toFixed(1)}%.`));

  if (tendencia.length >= 3) {
    const last3 = tendencia.slice(-3);
    if (last3[2].taxa < last3[0].taxa && last3[1].taxa < last3[0].taxa) {
      destaques.push(`Tendência de redução na taxa de ISC: ${last3.map((t) => t.taxa + "%").join(" → ")}.`);
    }
  }

  if (destaques.length > 0) {
    report += `\n✅ DESTAQUES POSITIVOS\n`;
    destaques.forEach((d) => { report += `• ${d}\n`; });
  }

  // --- Recomendações ---
  report += `\n📌 RECOMENDAÇÕES\n`;
  if (taxaISC > 5) {
    report += `• Convocar reunião extraordinária do CCIH para análise das causas.\n`;
    report += `• Realizar auditoria de processos de antissepsia e profilaxia antibiótica.\n`;
    report += `• Revisar técnica asséptica e protocolos de curativo.\n`;
  } else if (taxaISC > 2) {
    report += `• Manter vigilância ativa e monitorar tendência nos próximos meses.\n`;
    report += `• Revisar adesão aos bundles de prevenção de ISC.\n`;
  } else {
    report += `• Manter protocolos atuais e compartilhar boas práticas entre equipes.\n`;
    report += `• Documentar práticas de sucesso para replicação.\n`;
  }

  if (taxaResposta < 60) {
    report += `• Ampliar estratégias de busca ativa: múltiplas tentativas, horários alternativos, contato por mensagem.\n`;
  }

  const worst = clinicasComCirurgia.length > 1
    ? clinicasComCirurgia.reduce((a, b) => a.taxaISC > b.taxaISC ? a : b)
    : null;
  if (worst && worst.taxaISC > 3) {
    report += `• Priorizar ações corretivas na clínica de ${worst.name} (maior taxa de ISC).\n`;
  }

  if (promptExtra) {
    report += `\n💬 OBSERVAÇÃO ADICIONAL\n`;
    report += `Sobre "${promptExtra}": recomenda-se aprofundar esta análise com dados clínicos específicos na próxima reunião do CCIH.\n`;
  }

  report += `\n${"─".repeat(45)}\nRelatório gerado automaticamente em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;

  return report;
}
