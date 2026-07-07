export type AuditReportMode = 'single_audit_type' | 'monthly_sector_compiled';

export interface AuditRecord {
  id: string;
  hospital_id: string;
  sector: string;
  audit_type: string;
  audit_date: string;
  total_items: number;
  compliant_items: number;
  compliance_rate: number;
  observations?: string | null;
}

export interface AuditItemRecord {
  id: string;
  audit_id: string;
  item_order?: number;
  question: string;
  category: string;
  status: 'compliant' | 'non_compliant' | 'not_applicable' | 'not_evaluated';
  observation?: string | null;
}

export interface AuditActionPlanRecord {
  action: string;
  reason: string;
  responsible: string;
  deadline: string;
  how: string;
  status: 'sugerido' | 'pendente' | 'em_andamento' | 'concluido' | 'atrasado';
}

export interface AuditManagerReportMetrics {
  totalAudits: number;
  totalItems: number;
  compliantItems: number;
  nonCompliantItems: number;
  notApplicableItems: number;
  generalComplianceRate: number;
  nonComplianceRate: number;
  totalProfessionalsObserved: number;
  totalAuditors: number;
  performanceClassification: 'Excelente' | 'Bom' | 'Regular' | 'Crítico';
  statusColor: 'verde' | 'amarelo' | 'vermelho';
  complianceBySector: Record<string, number>;
  complianceByCategory: Record<string, number>;
  complianceByQuestion: Record<string, number>;
  complianceByProfessionalCategory: Record<string, number>;
  auditsByAuditor: Record<string, number>;
  topPositiveFindings: string[];
  topNegativeFindings: string[];
  topNonCompliances: Array<{ category: string; question: string; count: number; rate?: number }>;
  recurrentNonCompliances: string[];
  trend: 'Melhorou' | 'Estável' | 'Piorou' | 'Sem histórico';
  previousComplianceRate?: number;
  complianceDelta?: number;
  lowSampleAlert: boolean;
  recordQuality: 'Boa' | 'Regular' | 'Insuficiente';
  suggestedActions: AuditActionPlanRecord[];
}

export interface MonthlySectorCompiledAuditMetrics {
  totalAudits: number;
  totalAuditTypes: number;
  auditTypesIncluded: string[];
  totalItems: number;
  compliantItems: number;
  nonCompliantItems: number;
  generalComplianceRate: number;
  complianceByAuditType: Record<string, number>;
  totalAuditsByType: Record<string, number>;
  nonCompliancesByAuditType: Record<string, number>;
  worstAuditTypes: Array<{ auditType: string; complianceRate: number; nonCompliantItems: number }>;
  bestAuditTypes: Array<{ auditType: string; complianceRate: number }>;
  topNonCompliances: Array<{ auditType: string; category: string; question: string; count: number }>;
  positiveFindings: string[];
  negativeFindings: string[];
  improvementPriorities: string[];
  suggestedActionPlan: AuditActionPlanRecord[];
}

export interface GenerateAuditReportParams {
  mode: AuditReportMode;
  hospitalId: string;
  sectors: string[];
  periodStart: string;
  periodEnd: string;
  auditType?: string;
  managerName?: string;
  managerEmail?: string;
  technicalResponsible?: string;
}

export interface HospitalLogo {
  url: string;
  logo_type: string;
  display_name: string | null;
}
