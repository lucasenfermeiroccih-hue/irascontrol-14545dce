import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import {
  Baby, AlertTriangle, CheckCircle2, TrendingUp,
  Activity, Users, ClipboardCheck, Loader2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { getMaternityRecord, listMaternityRecords } from "@/lib/maternity-service";
import { calculateMaternityIndicators, getMaternityAlerts } from "@/lib/maternity-indicators";
import type { MaternityMonthlyRecord } from "@/lib/maternity-types";
import { MONTH_NAMES } from "@/lib/maternity-types";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

export default function MaternityDashboard() {
  const { hospitalId } = useHospitalContext();
  const navigate = useNavigate();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [record, setRecord] = useState<MaternityMonthlyRecord | null>(null);
  const [yearRecords, setYearRecords] = useState<MaternityMonthlyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;
    async function load() {
      setLoading(true);
      try {
        const [rec, yearly] = await Promise.all([
          getMaternityRecord({ hospitalId: hospitalId!, month, year }),
          listMaternityRecords(hospitalId!, year),
        ]);
        setRecord(rec);
        setYearRecords(yearly);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hospitalId, month, year]);

  const indicators = useMemo(() => record ? calculateMaternityIndicators(record) : null, [record]);
  const alerts = useMemo(() => indicators ? getMaternityAlerts(indicators) : [], [indicators]);

  const trendData = useMemo(() =>
    yearRecords.map(r => {
      const ind = calculateMaternityIndicators(r);
      return {
        name: MONTH_NAMES[r.month].slice(0, 3),
        "Inf. Puerperal (%)": ind.puerperalInfectionRate ?? 0,
        "ISC Pós-cesar. (%)": ind.postCesareanSsiRate ?? 0,
        "Busca Pós-alta (%)": ind.postDischargeSearchRate ?? 0,
      };
    }),
  [yearRecords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Baby className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard Maternidade</h1>
          <p className="text-sm text-muted-foreground">Indicadores assistenciais e epidemiológicos</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.slice(1).map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!record ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Baby className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum lançamento encontrado para {MONTH_NAMES[month]}/{year}.</p>
            <Button className="mt-4" onClick={() => navigate("/maternidade/lancamento")}>
              Fazer lançamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de volume */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Partos" value={record.total_births} icon={<Baby className="h-5 w-5" />} />
            <StatCard title="Cesarianas" value={record.total_cesareans} icon={<Activity className="h-5 w-5" />} />
            <StatCard title="Admissões" value={record.total_admissions} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Capacitações" value={record.trainings_count} icon={<ClipboardCheck className="h-5 w-5" />} />
          </div>

          {/* Indicadores principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <IndicatorCard
                label="Taxa de ocupação"
                value={indicators?.occupancyRate !== null && indicators?.occupancyRate !== undefined ? `${indicators.occupancyRate}%` : "—"}
                meta="Meta: ≤ 90%"
              />
              <IndicatorCard
                label="Tempo médio de permanência"
                value={indicators?.avgLengthOfStay !== null && indicators?.avgLengthOfStay !== undefined ? `${indicators.avgLengthOfStay} dias` : "—"}
              />
              <IndicatorCard
                label="Infecção puerperal"
                value={indicators?.puerperalInfectionRate !== null && indicators?.puerperalInfectionRate !== undefined ? `${indicators.puerperalInfectionRate}%` : "—"}
                meta="Meta: 0%"
                danger={(indicators?.puerperalInfectionRate ?? 0) > 0}
              />
              <IndicatorCard
                label="ISC pós-cesariana"
                value={indicators?.postCesareanSsiRate !== null && indicators?.postCesareanSsiRate !== undefined ? `${indicators.postCesareanSsiRate}%` : "—"}
                meta="Meta: 0%"
                danger={(indicators?.postCesareanSsiRate ?? 0) > 0}
              />
              <IndicatorCard
                label="Busca ativa pós-alta"
                value={indicators?.postDischargeSearchRate !== null && indicators?.postDischargeSearchRate !== undefined ? `${indicators.postDischargeSearchRate}%` : "—"}
                meta="Meta: ≥ 80%"
              />
              <IndicatorCard
                label="Investigação epidemiológica"
                value={indicators?.epidemiologicalInvestigationRate !== null && indicators?.epidemiologicalInvestigationRate !== undefined ? `${indicators.epidemiologicalInvestigationRate}%` : "—"}
                meta="Meta: 100%"
              />
            </div>

            {/* Alertas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Alertas e recomendações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Nenhum alerta crítico identificado no período.
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.indicatorKey}
                      className={`rounded-lg border p-3 text-sm ${
                        alert.type === "danger"
                          ? "bg-red-50 border-red-200 text-red-800"
                          : "bg-yellow-50 border-yellow-200 text-yellow-800"
                      }`}
                    >
                      <div className="font-semibold mb-1">{alert.title}</div>
                      <div>{alert.message}</div>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-1 text-xs"
                        onClick={() => navigate("/maternidade/plano-acao")}
                      >
                        Abrir plano de ação →
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Indicadores de educação permanente */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <IndicatorCard label="Profissionais capacitados" value={indicators?.trainedProfessionalsRate !== null && indicators?.trainedProfessionalsRate !== undefined ? `${indicators.trainedProfessionalsRate}%` : "—"} meta="Meta: ≥ 80%" />
            <IndicatorCard label="Carga horária de treinamentos" value={`${indicators?.trainingHours ?? 0}h`} />
            <IndicatorCard label="Reinternação por infecção" value={indicators?.puerperalInfectionReadmissionRate !== null && indicators?.puerperalInfectionReadmissionRate !== undefined ? `${indicators.puerperalInfectionReadmissionRate}%` : "—"} meta="Meta: 0%" danger={(indicators?.puerperalInfectionReadmissionRate ?? 0) > 0} />
          </div>

          {/* Gráfico de tendência anual */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Tendência anual — {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Inf. Puerperal (%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="ISC Pós-cesar. (%)" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Busca Pós-alta (%)" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => navigate("/maternidade/lancamento")}>
              Editar lançamento
            </Button>
            <Button onClick={() => navigate("/maternidade/relatorio")}>
              Gerar relatório PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IndicatorCard({ label, value, meta, danger }: { label: string; value: string; meta?: string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${danger ? "bg-red-50 border-red-200" : "bg-background"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${danger ? "text-red-700" : ""}`}>{value}</p>
      {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
    </div>
  );
}
