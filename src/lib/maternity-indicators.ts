import type { MaternityMonthlyRecord, MaternityIndicators } from './maternity-types';

function percent(numerator?: number | null, denominator?: number | null): number | null {
  if (!denominator || denominator <= 0) return null;
  return Number(((Number(numerator || 0) / Number(denominator)) * 100).toFixed(2));
}

function ratio(numerator?: number | null, denominator?: number | null): number | null {
  if (!denominator || denominator <= 0) return null;
  return Number((Number(numerator || 0) / Number(denominator)).toFixed(2));
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateMaternityIndicators(record: MaternityMonthlyRecord): MaternityIndicators {
  const totalDays = daysInMonth(record.month, record.year);
  const bedsCapacity = (record.beds_available || 0) * totalDays;

  return {
    occupancyRate: bedsCapacity > 0 ? percent(record.patient_days, bedsCapacity) : null,
    avgLengthOfStay: ratio(record.sum_length_of_stay_days, record.discharged_patients),
    puerperalInfectionRate: percent(record.puerperal_infection_cases, record.total_births),
    postCesareanSsiRate: percent(record.post_cesarean_ssi_cases, record.total_cesareans),
    puerperalInfectionReadmissionRate: percent(record.puerperal_infection_readmissions, record.total_births),
    postDischargeSearchRate: percent(record.post_discharge_contacted_patients, record.post_discharge_eligible_patients),
    epidemiologicalInvestigationRate: percent(record.investigated_infection_cases, record.identified_infection_cases),
    trainingsCount: record.trainings_count || 0,
    trainingHours: Number(record.training_hours || 0),
    trainedProfessionalsRate: percent(record.professionals_trained, record.professionals_eligible),
  };
}

export function getMaternityAlerts(indicators: MaternityIndicators) {
  const alerts: Array<{
    type: 'success' | 'warning' | 'danger';
    title: string;
    message: string;
    indicatorKey: string;
  }> = [];

  if (indicators.puerperalInfectionRate !== null && indicators.puerperalInfectionRate > 0) {
    alerts.push({
      type: 'danger',
      title: 'Infecção puerperal identificada',
      message: `Taxa atual: ${indicators.puerperalInfectionRate}%. Recomenda-se investigação epidemiológica e abertura de plano de ação.`,
      indicatorKey: 'puerperalInfectionRate',
    });
  }

  if (indicators.postCesareanSsiRate !== null && indicators.postCesareanSsiRate > 0) {
    alerts.push({
      type: 'danger',
      title: 'ISC pós-cesariana identificada',
      message: `Taxa atual: ${indicators.postCesareanSsiRate}%. Avaliar antibioticoprofilaxia, técnica cirúrgica, curativo e busca pós-alta.`,
      indicatorKey: 'postCesareanSsiRate',
    });
  }

  if (indicators.postDischargeSearchRate !== null && indicators.postDischargeSearchRate < 80) {
    alerts.push({
      type: 'warning',
      title: 'Busca ativa pós-alta insuficiente',
      message: `Cobertura atual: ${indicators.postDischargeSearchRate}%. Reforçar contato telefônico, ambulatório e retorno programado.`,
      indicatorKey: 'postDischargeSearchRate',
    });
  }

  if (indicators.epidemiologicalInvestigationRate !== null && indicators.epidemiologicalInvestigationRate < 100) {
    alerts.push({
      type: 'warning',
      title: 'Casos sem investigação completa',
      message: `Investigação atual: ${indicators.epidemiologicalInvestigationRate}%. Todo caso infeccioso deve ter ficha epidemiológica encerrada.`,
      indicatorKey: 'epidemiologicalInvestigationRate',
    });
  }

  if (indicators.trainedProfessionalsRate !== null && indicators.trainedProfessionalsRate < 80) {
    alerts.push({
      type: 'warning',
      title: 'Cobertura de treinamento abaixo do ideal',
      message: `Cobertura atual: ${indicators.trainedProfessionalsRate}%. Recomenda-se cronograma de educação permanente.`,
      indicatorKey: 'trainedProfessionalsRate',
    });
  }

  return alerts;
}

export function generateSuggestedActionPlan(indicatorKey: string) {
  const plans: Record<string, { problem: string; root_cause: string; action: string; responsible: string; priority: string; evidence: string }> = {
    puerperalInfectionRate: {
      problem: 'Ocorrência de infecção puerperal no período avaliado.',
      root_cause: 'A definir após investigação epidemiológica.',
      action: 'Realizar investigação epidemiológica dos casos, revisar prontuários, avaliar fatores de risco e implementar medidas corretivas.',
      responsible: 'SCIH / Obstetrícia',
      priority: 'critical',
      evidence: 'Ficha de investigação, relatório SCIH, prontuário e registro de ação corretiva.',
    },
    postCesareanSsiRate: {
      problem: 'Ocorrência de infecção de sítio cirúrgico pós-cesariana.',
      root_cause: 'A definir após análise do processo cirúrgico e pós-operatório.',
      action: 'Revisar antibioticoprofilaxia, técnica cirúrgica, preparo de pele, curativo, orientação de alta e busca ativa pós-alta.',
      responsible: 'SCIH / Centro Cirúrgico / Obstetrícia',
      priority: 'critical',
      evidence: 'Checklist cirúrgico, ficha SCIH, auditoria e plano de ação.',
    },
    postDischargeSearchRate: {
      problem: 'Cobertura insuficiente de busca ativa pós-alta.',
      root_cause: 'Falha de contato, ausência de fluxo padronizado ou registro incompleto.',
      action: 'Implantar rotina de contato pós-alta, padronizar formulário, definir responsável e monitorar cobertura mensal.',
      responsible: 'SCIH / Ambulatório / Obstetrícia',
      priority: 'high',
      evidence: 'Planilha de busca ativa, registros telefônicos e relatório mensal.',
    },
    epidemiologicalInvestigationRate: {
      problem: 'Casos infecciosos sem investigação epidemiológica completa.',
      root_cause: 'Atraso no preenchimento da ficha ou ausência de fluxo de notificação.',
      action: 'Revisar fluxo de notificação, definir prazo máximo para encerramento da ficha e capacitar equipe.',
      responsible: 'SCIH / Epidemiologia',
      priority: 'high',
      evidence: 'Fichas de investigação, relatório de casos encerrados.',
    },
    trainedProfessionalsRate: {
      problem: 'Cobertura insuficiente de profissionais capacitados.',
      root_cause: 'Baixa adesão, escala incompatível ou ausência de cronograma fixo.',
      action: 'Executar cronograma mensal de capacitação com busca ativa dos profissionais não treinados.',
      responsible: 'Educação Permanente / SCIH / Coordenação de Enfermagem',
      priority: 'medium',
      evidence: 'Lista de presença, pré-teste, pós-teste e material educativo.',
    },
  };

  return plans[indicatorKey] || {
    problem: 'Indicador fora do parâmetro esperado.',
    root_cause: 'A definir após análise crítica.',
    action: 'Realizar análise crítica do indicador, identificar causa raiz e propor ação corretiva.',
    responsible: 'Gestor do setor / SCIH',
    priority: 'medium',
    evidence: 'Relatório mensal e registro de plano de ação.',
  };
}
