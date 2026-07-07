export type MaternityRecordStatus = 'draft' | 'submitted' | 'validated' | 'reopened';
export type MaternityActionPlanStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type MaternityActionPlanPriority = 'low' | 'medium' | 'high' | 'critical';

export interface MaternityMonthlyRecord {
  id?: string;
  hospital_id: string;
  sector_id?: string | null;
  month: number;
  year: number;

  // Volume obstétrico
  total_admissions: number;
  total_births: number;
  total_vaginal_births: number;
  total_cesareans: number;

  // Ocupação e permanência
  beds_available: number;
  patient_days: number;
  discharged_patients: number;
  sum_length_of_stay_days: number;

  // Infecção obstétrica
  puerperal_infection_cases: number;
  post_cesarean_ssi_cases: number;
  puerperal_infection_readmissions: number;
  post_discharge_eligible_patients: number;
  post_discharge_contacted_patients: number;
  identified_infection_cases: number;
  investigated_infection_cases: number;

  // Educação permanente
  trainings_count: number;
  training_hours: number;
  professionals_trained: number;
  professionals_eligible: number;

  analysis?: string | null;
  observations?: string | null;
  status: MaternityRecordStatus;
  created_by?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaternityIndicators {
  // Ocupação e permanência
  occupancyRate: number | null;
  avgLengthOfStay: number | null;

  // Infecção puerperal
  puerperalInfectionRate: number | null;
  postCesareanSsiRate: number | null;
  puerperalInfectionReadmissionRate: number | null;
  postDischargeSearchRate: number | null;
  epidemiologicalInvestigationRate: number | null;

  // Educação permanente
  trainingsCount: number;
  trainingHours: number;
  trainedProfessionalsRate: number | null;
}

export interface MaternityActionPlan {
  id?: string;
  hospital_id: string;
  monthly_record_id?: string | null;
  indicator_key: string;
  problem: string;
  root_cause?: string | null;
  action: string;
  responsible: string;
  due_date?: string | null;
  evidence?: string | null;
  status: MaternityActionPlanStatus;
  priority: MaternityActionPlanPriority;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const MATERNITY_INDICATOR_LABELS: Record<string, string> = {
  occupancyRate: 'Taxa de ocupação obstétrica',
  avgLengthOfStay: 'Tempo médio de permanência',
  puerperalInfectionRate: 'Taxa de infecção puerperal',
  postCesareanSsiRate: 'ISC pós-cesariana',
  puerperalInfectionReadmissionRate: 'Reinternação por infecção puerperal',
  postDischargeSearchRate: 'Busca ativa pós-alta',
  epidemiologicalInvestigationRate: 'Investigação epidemiológica',
  trainingsCount: 'Capacitações realizadas',
  trainingHours: 'Carga horária de treinamentos',
  trainedProfessionalsRate: 'Profissionais capacitados',
};

export const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
