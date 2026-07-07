import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Send, Baby, Loader2 } from "lucide-react";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { getMaternityRecord, upsertMaternityRecord } from "@/lib/maternity-service";
import { calculateMaternityIndicators } from "@/lib/maternity-indicators";
import type { MaternityMonthlyRecord } from "@/lib/maternity-types";
import { MONTH_NAMES } from "@/lib/maternity-types";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

function defaultRecord(hospitalId: string, month: number, year: number): MaternityMonthlyRecord {
  return {
    hospital_id: hospitalId,
    sector_id: null,
    month,
    year,
    total_admissions: 0,
    total_births: 0,
    total_vaginal_births: 0,
    total_cesareans: 0,
    beds_available: 0,
    patient_days: 0,
    discharged_patients: 0,
    sum_length_of_stay_days: 0,
    puerperal_infection_cases: 0,
    post_cesarean_ssi_cases: 0,
    puerperal_infection_readmissions: 0,
    post_discharge_eligible_patients: 0,
    post_discharge_contacted_patients: 0,
    identified_infection_cases: 0,
    investigated_infection_cases: 0,
    trainings_count: 0,
    training_hours: 0,
    professionals_trained: 0,
    professionals_eligible: 0,
    analysis: "",
    observations: "",
    status: "draft",
  };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado para validação",
  validated: "Validado",
  reopened: "Reaberto",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  submitted: "default",
  validated: "default",
  reopened: "outline",
};

export default function MaternityMonthlyForm() {
  const { hospitalId, userId } = useHospitalContext();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [record, setRecord] = useState<MaternityMonthlyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    async function load() {
      setLoading(true);
      try {
        const existing = await getMaternityRecord({ hospitalId: hospitalId!, month, year });
        setRecord(existing || defaultRecord(hospitalId!, month, year));
      } catch {
        toast.error("Erro ao carregar lançamento.");
        setRecord(defaultRecord(hospitalId!, month, year));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hospitalId, month, year]);

  const indicators = useMemo(() => record ? calculateMaternityIndicators(record) : null, [record]);

  function setNum(field: keyof MaternityMonthlyRecord, value: string) {
    setRecord(prev => prev ? { ...prev, [field]: Number(value) || 0 } : prev);
  }

  function setText(field: keyof MaternityMonthlyRecord, value: string) {
    setRecord(prev => prev ? { ...prev, [field]: value } : prev);
  }

  async function save(status: "draft" | "submitted") {
    if (!record) return;
    setSaving(true);
    try {
      const saved = await upsertMaternityRecord({ ...record, status, created_by: userId ?? undefined });
      setRecord(saved);
      toast.success(status === "submitted" ? "Enviado para validação." : "Salvo como rascunho.");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  const isReadonly = record?.status === "validated" || record?.status === "submitted";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Baby className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Lançamento Mensal — Maternidade</h1>
          <p className="text-sm text-muted-foreground">Informe os dados do período selecionado</p>
        </div>
        {record?.status && (
          <Badge variant={STATUS_VARIANTS[record.status]} className="ml-auto">
            {STATUS_LABELS[record.status]}
          </Badge>
        )}
      </div>

      {/* Seleção de período */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Mês</Label>
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.slice(1).map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ano</Label>
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>

      {record && (
        <>
          {/* Volume obstétrico */}
          <Card>
            <CardHeader><CardTitle className="text-base">Volume obstétrico</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberField label="Admissões" value={record.total_admissions} onChange={v => setNum("total_admissions", v)} disabled={isReadonly} />
                <NumberField label="Total de partos" value={record.total_births} onChange={v => setNum("total_births", v)} disabled={isReadonly} />
                <NumberField label="Partos vaginais" value={record.total_vaginal_births} onChange={v => setNum("total_vaginal_births", v)} disabled={isReadonly} />
                <NumberField label="Cesarianas" value={record.total_cesareans} onChange={v => setNum("total_cesareans", v)} disabled={isReadonly} />
              </div>
            </CardContent>
          </Card>

          {/* Ocupação e permanência */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ocupação e tempo médio de permanência</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberField label="Leitos obstétricos disponíveis" value={record.beds_available} onChange={v => setNum("beds_available", v)} disabled={isReadonly} />
                <NumberField label="Paciente-dia (soma)" value={record.patient_days} onChange={v => setNum("patient_days", v)} disabled={isReadonly} />
                <NumberField label="Saídas (altas + óbitos)" value={record.discharged_patients} onChange={v => setNum("discharged_patients", v)} disabled={isReadonly} />
                <NumberField label="Soma dias de internação das saídas" value={record.sum_length_of_stay_days} onChange={v => setNum("sum_length_of_stay_days", v)} disabled={isReadonly} />
              </div>
              {indicators && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricPreview label="Taxa de ocupação" value={indicators.occupancyRate !== null ? `${indicators.occupancyRate}%` : "—"} />
                  <MetricPreview label="Tempo médio de permanência" value={indicators.avgLengthOfStay !== null ? `${indicators.avgLengthOfStay} dias` : "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Infecção obstétrica */}
          <Card>
            <CardHeader><CardTitle className="text-base">Monitoramento de infecção puerperal e ISC</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <NumberField label="Casos de infecção puerperal" value={record.puerperal_infection_cases} onChange={v => setNum("puerperal_infection_cases", v)} disabled={isReadonly} />
                <NumberField label="ISC pós-cesariana" value={record.post_cesarean_ssi_cases} onChange={v => setNum("post_cesarean_ssi_cases", v)} disabled={isReadonly} />
                <NumberField label="Reinternações por infecção puerperal" value={record.puerperal_infection_readmissions} onChange={v => setNum("puerperal_infection_readmissions", v)} disabled={isReadonly} />
                <NumberField label="Elegíveis para busca pós-alta" value={record.post_discharge_eligible_patients} onChange={v => setNum("post_discharge_eligible_patients", v)} disabled={isReadonly} />
                <NumberField label="Contatadas / avaliadas pós-alta" value={record.post_discharge_contacted_patients} onChange={v => setNum("post_discharge_contacted_patients", v)} disabled={isReadonly} />
                <NumberField label="Casos infecciosos identificados" value={record.identified_infection_cases} onChange={v => setNum("identified_infection_cases", v)} disabled={isReadonly} />
                <NumberField label="Casos investigados" value={record.investigated_infection_cases} onChange={v => setNum("investigated_infection_cases", v)} disabled={isReadonly} />
              </div>
              {indicators && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <MetricPreview label="Taxa infecção puerperal" value={indicators.puerperalInfectionRate !== null ? `${indicators.puerperalInfectionRate}%` : "—"} danger={(indicators.puerperalInfectionRate ?? 0) > 0} />
                  <MetricPreview label="ISC pós-cesariana" value={indicators.postCesareanSsiRate !== null ? `${indicators.postCesareanSsiRate}%` : "—"} danger={(indicators.postCesareanSsiRate ?? 0) > 0} />
                  <MetricPreview label="Busca ativa pós-alta" value={indicators.postDischargeSearchRate !== null ? `${indicators.postDischargeSearchRate}%` : "—"} />
                  <MetricPreview label="Investigação epidemiológica" value={indicators.epidemiologicalInvestigationRate !== null ? `${indicators.epidemiologicalInvestigationRate}%` : "—"} />
                  <MetricPreview label="Reinternação por infecção" value={indicators.puerperalInfectionReadmissionRate !== null ? `${indicators.puerperalInfectionReadmissionRate}%` : "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Educação permanente */}
          <Card>
            <CardHeader><CardTitle className="text-base">Educação permanente</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberField label="Capacitações realizadas" value={record.trainings_count} onChange={v => setNum("trainings_count", v)} disabled={isReadonly} />
                <NumberField label="Carga horária total (h)" value={record.training_hours} onChange={v => setNum("training_hours", v)} disabled={isReadonly} />
                <NumberField label="Profissionais capacitados" value={record.professionals_trained} onChange={v => setNum("professionals_trained", v)} disabled={isReadonly} />
                <NumberField label="Profissionais elegíveis" value={record.professionals_eligible} onChange={v => setNum("professionals_eligible", v)} disabled={isReadonly} />
              </div>
              {indicators && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <MetricPreview label="Capacitações" value={String(indicators.trainingsCount)} />
                  <MetricPreview label="Horas de treinamento" value={`${indicators.trainingHours}h`} />
                  <MetricPreview label="Profissionais capacitados" value={indicators.trainedProfessionalsRate !== null ? `${indicators.trainedProfessionalsRate}%` : "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Análise crítica */}
          <Card>
            <CardHeader><CardTitle className="text-base">Análise crítica e observações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Análise crítica</Label>
                <Textarea
                  value={record.analysis || ""}
                  onChange={e => setText("analysis", e.target.value)}
                  disabled={isReadonly}
                  placeholder="Descreva a análise crítica, tendências e pontos de atenção do período."
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea
                  value={record.observations || ""}
                  onChange={e => setText("observations", e.target.value)}
                  disabled={isReadonly}
                  placeholder="Observações adicionais, intercorrências ou justificativas."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          {!isReadonly && (
            <div className="flex gap-3 justify-end">
              <Button variant="outline" disabled={saving} onClick={() => save("draft")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar rascunho
              </Button>
              <Button disabled={saving} onClick={() => save("submitted")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar para validação
              </Button>
            </div>
          )}
          {isReadonly && (
            <p className="text-sm text-muted-foreground text-right">
              Lançamento com status "{STATUS_LABELS[record.status]}" — edição bloqueada.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? 0}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}

function MetricPreview({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${danger ? "bg-red-50 border-red-200" : "bg-muted/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${danger ? "text-red-700" : ""}`}>{value}</div>
    </div>
  );
}
