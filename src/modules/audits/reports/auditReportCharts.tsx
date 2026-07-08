import { forwardRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import type { AuditRecord, AuditItemRecord, AuditManagerReportMetrics, MonthlySectorCompiledAuditMetrics, AuditReportMode } from "./auditReportTypes";

const COLORS = {
  compliant: "#22c55e",
  nonCompliant: "#ef4444",
  primary: "#3b82f6",
  warning: "#f59e0b",
  purple: "#8b5cf6",
};

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#10b981", "#f97316", "#6366f1",
];

interface ChartsRendererProps {
  audits: AuditRecord[];
  items: AuditItemRecord[];
  metrics: AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics;
  mode: AuditReportMode;
}

// ─── Hook de dados compartilhado ──────────────────────────────────────────────

function useChartsData(audits: AuditRecord[], items: AuditItemRecord[], metrics: ChartsRendererProps["metrics"], mode: AuditReportMode) {
  const monthlyTrend = useMemo(() => {
    const byMonth: Record<string, { sum: number; count: number }> = {};
    audits.forEach(a => {
      const month = a.audit_date.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { sum: 0, count: 0 };
      byMonth[month].sum += a.compliance_rate ?? 0;
      byMonth[month].count++;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, compliance: Math.round((v.sum / v.count) * 10) / 10 }));
  }, [audits]);

  const categoryData = useMemo(() => {
    const cat = ("complianceByCategory" in metrics ? metrics.complianceByCategory : {}) as Record<string, number>;
    return Object.entries(cat)
      .sort((a, b) => a[1] - b[1])
      .map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 20) + "…" : name, value }));
  }, [metrics]);

  const sectorData = useMemo(() => {
    const sec = ("complianceBySector" in metrics ? metrics.complianceBySector : {}) as Record<string, number>;
    return Object.entries(sec)
      .sort((a, b) => a[1] - b[1])
      .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + "…" : name, value }));
  }, [metrics]);

  const topNC = useMemo(() => {
    const ncs = (metrics.topNonCompliances ?? []) as Array<{ question: string; count: number; category?: string }>;
    return ncs.slice(0, 8).map(n => ({
      name: n.question.length > 32 ? n.question.slice(0, 30) + "…" : n.question,
      count: n.count,
    }));
  }, [metrics]);

  const notApplicable = "notApplicableItems" in metrics ? (metrics.notApplicableItems ?? 0) : 0;
  const donutData = useMemo(() => [
    { name: "Conforme", value: metrics.compliantItems ?? 0, color: COLORS.compliant },
    { name: "Não Conforme", value: metrics.nonCompliantItems ?? 0, color: COLORS.nonCompliant },
    { name: "N/A", value: notApplicable, color: "#94a3b8" },
  ].filter(d => d.value > 0), [metrics, notApplicable]);

  const compiledTypeData = useMemo(() => {
    if (mode !== "monthly_sector_compiled") return [];
    const byType = (metrics as MonthlySectorCompiledAuditMetrics).complianceByAuditType ?? {};
    return Object.entries(byType)
      .sort((a, b) => a[1] - b[1])
      .map(([type, value], i) => ({
        name: type.replace(/_/g, " ").slice(0, 18),
        value,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [metrics, mode]);

  return { monthlyTrend, categoryData, sectorData, topNC, donutData, compiledTypeData };
}

// ─── Renderer oculto para captura PDF (dimensões fixas + sem animação) ────────

export const AuditReportChartsRenderer = forwardRef<HTMLDivElement, ChartsRendererProps>(
  ({ audits, items, metrics, mode }, ref) => {
    const { monthlyTrend, categoryData, sectorData, topNC, donutData, compiledTypeData } = useChartsData(audits, items, metrics, mode);

    const s = { background: "#fff", padding: "8px" };

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "720px",
          background: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Chart 1: Donut */}
        <div id="chart-overall" style={{ ...s, width: 420, height: 320, margin: "0 auto" }}>
          <div style={{ textAlign: "center", fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
            Conformidade Geral
          </div>
          <PieChart width={400} height={280}>
            <Pie
              data={donutData} cx={200} cy={130} innerRadius={70} outerRadius={110} dataKey="value"
              label={({ name, value }) => `${name}: ${value}`} labelLine
              isAnimationActive={false}
            >
              {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </div>

        {/* Chart 2: Conformidade por Categoria */}
        <div id="chart-category" style={{ ...s, width: 700, height: Math.max(300, categoryData.length * 36 + 60), marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
            Conformidade por Categoria (%)
          </div>
          <BarChart
            width={680} height={Math.max(260, categoryData.length * 36)}
            data={categoryData} layout="vertical"
            margin={{ left: 130, right: 30, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
            <Bar dataKey="value" isAnimationActive={false} radius={[0, 4, 4, 0]}>
              {categoryData.map((d, i) => (
                <Cell key={i} fill={d.value >= 85 ? COLORS.compliant : d.value >= 70 ? COLORS.warning : COLORS.nonCompliant} />
              ))}
            </Bar>
          </BarChart>
        </div>

        {/* Chart 3: Conformidade por Setor */}
        {sectorData.length > 0 && (
          <div id="chart-sector" style={{ ...s, width: 700, height: 320, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Conformidade por Setor (%)
            </div>
            <BarChart width={680} height={280} data={sectorData} margin={{ left: 20, right: 30, top: 5, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                {sectorData.map((d, i) => (
                  <Cell key={i} fill={d.value >= 85 ? COLORS.compliant : d.value >= 70 ? COLORS.warning : COLORS.nonCompliant} />
                ))}
              </Bar>
            </BarChart>
          </div>
        )}

        {/* Chart 4: Top Não Conformidades */}
        {topNC.length > 0 && (
          <div id="chart-noncompliance" style={{ ...s, width: 700, height: Math.max(300, topNC.length * 40 + 60), marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Principais Não Conformidades (ocorrências)
            </div>
            <BarChart
              width={680} height={Math.max(260, topNC.length * 40)}
              data={topNC} layout="vertical"
              margin={{ left: 185, right: 30, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS.nonCompliant} isAnimationActive={false} radius={[0, 4, 4, 0]} />
            </BarChart>
          </div>
        )}

        {/* Chart 5: Evolução Mensal */}
        {monthlyTrend.length > 1 && (
          <div id="chart-trend" style={{ ...s, width: 700, height: 280, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Evolução Mensal da Conformidade (%)
            </div>
            <AreaChart width={680} height={240} data={monthlyTrend} margin={{ left: 20, right: 30, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Area type="monotone" dataKey="compliance" stroke={COLORS.primary} fill={`${COLORS.primary}33`} strokeWidth={2} dot isAnimationActive={false} />
            </AreaChart>
          </div>
        )}

        {/* Chart 6: Por tipo de auditoria (compilado) */}
        {mode === "monthly_sector_compiled" && compiledTypeData.length > 0 && (
          <div id="chart-by-type" style={{ ...s, width: 700, height: 360, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Conformidade por Tipo de Auditoria (%)
            </div>
            <BarChart width={680} height={320} data={compiledTypeData} margin={{ left: 20, right: 30, top: 5, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                {compiledTypeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </div>
        )}
      </div>
    );
  }
);

AuditReportChartsRenderer.displayName = "AuditReportChartsRenderer";

// ─── Preview visual dos gráficos na aba do modal ──────────────────────────────
// Usa dimensões fixas para garantir renderização dentro de Dialog/ScrollArea
// (ResponsiveContainer width="100%" falha quando o pai não tem largura computada)

export function AuditReportChartsPreview({ audits, items, metrics, mode }: ChartsRendererProps) {
  const { monthlyTrend, categoryData, sectorData, topNC, donutData, compiledTypeData } = useChartsData(audits, items, metrics, mode);

  const W = 620; // largura fixa que cabe no Dialog max-w-4xl com px-6

  if (donutData.length === 0 && categoryData.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Sem dados suficientes para exibir gráficos.
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2" style={{ minWidth: W }}>

      {/* Linha 1: Donut + Tendência lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {donutData.length > 0 && (
          <div className="bg-white rounded-lg border p-3">
            <p className="text-xs font-semibold mb-2 text-slate-700">Conformidade Geral</p>
            <PieChart width={280} height={220}>
              <Pie
                data={donutData} cx={140} cy={100}
                innerRadius={50} outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${value}`}
                isAnimationActive={false}
              >
                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        )}

        {monthlyTrend.length > 1 && (
          <div className="bg-white rounded-lg border p-3">
            <p className="text-xs font-semibold mb-2 text-slate-700">Evolução Mensal (%)</p>
            <AreaChart width={280} height={220} data={monthlyTrend} margin={{ left: 0, right: 10, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Area type="monotone" dataKey="compliance" stroke={COLORS.primary} fill={`${COLORS.primary}33`} strokeWidth={2} dot isAnimationActive={false} />
            </AreaChart>
          </div>
        )}
      </div>

      {/* Conformidade por Categoria */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-lg border p-3 overflow-x-auto">
          <p className="text-xs font-semibold mb-2 text-slate-700">Conformidade por Categoria (%)</p>
          <BarChart
            width={W} height={Math.max(180, categoryData.length * 32)}
            data={categoryData} layout="vertical"
            margin={{ left: 130, right: 20, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
            <Bar dataKey="value" isAnimationActive={false} radius={[0, 4, 4, 0]}>
              {categoryData.map((d, i) => (
                <Cell key={i} fill={d.value >= 85 ? COLORS.compliant : d.value >= 70 ? COLORS.warning : COLORS.nonCompliant} />
              ))}
            </Bar>
          </BarChart>
        </div>
      )}

      {/* Conformidade por Setor */}
      {sectorData.length > 0 && (
        <div className="bg-white rounded-lg border p-3 overflow-x-auto">
          <p className="text-xs font-semibold mb-2 text-slate-700">Conformidade por Setor (%)</p>
          <BarChart
            width={W} height={Math.max(180, sectorData.length * 36)}
            data={sectorData} layout="vertical"
            margin={{ left: 130, right: 20, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
            <Bar dataKey="value" isAnimationActive={false} radius={[0, 4, 4, 0]}>
              {sectorData.map((d, i) => (
                <Cell key={i} fill={d.value >= 85 ? COLORS.compliant : d.value >= 70 ? COLORS.warning : COLORS.nonCompliant} />
              ))}
            </Bar>
          </BarChart>
        </div>
      )}

      {/* Top Não Conformidades */}
      {topNC.length > 0 && (
        <div className="bg-white rounded-lg border p-3 overflow-x-auto">
          <p className="text-xs font-semibold mb-2 text-slate-700">Principais Não Conformidades</p>
          <BarChart
            width={W} height={Math.max(180, topNC.length * 36)}
            data={topNC} layout="vertical"
            margin={{ left: 180, right: 20, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="name" width={175} tick={{ fontSize: 9 }} />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS.nonCompliant} isAnimationActive={false} radius={[0, 4, 4, 0]} />
          </BarChart>
        </div>
      )}

      {/* Por tipo de auditoria (compilado) */}
      {mode === "monthly_sector_compiled" && compiledTypeData.length > 0 && (
        <div className="bg-white rounded-lg border p-3 overflow-x-auto">
          <p className="text-xs font-semibold mb-2 text-slate-700">Conformidade por Tipo de Auditoria (%)</p>
          <BarChart
            width={W} height={300}
            data={compiledTypeData}
            margin={{ left: 20, right: 20, top: 5, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
            <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]}>
              {compiledTypeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </div>
      )}
    </div>
  );
}

// ─── PDF com gráficos ─────────────────────────────────────────────────────────

export async function generateReportPdfWithCharts(params: {
  chartsContainerRef: React.RefObject<HTMLDivElement>;
  markdownContent: string;
  hospitalName: string;
  sectorName: string;
  auditTypeName: string;
  period: string;
  hospitalLogoUrl?: string;
  metrics: AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics;
  mode: AuditReportMode;
  /** "save" (padrão) salva o arquivo; "base64" retorna o conteúdo como string base64 */
  outputMode?: "save" | "base64";
}): Promise<string | void> {
  const { chartsContainerRef, markdownContent, hospitalName, sectorName, auditTypeName, period, hospitalLogoUrl, metrics, mode } = params;

  const { default: jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  // Aguarda recharts finalizar renderização (sem animação, mas ainda precisa de um tick)
  await new Promise(r => setTimeout(r, 300));

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const marginL = 20;
  const marginR = 20;
  const marginT = 25;
  const marginB = 20;
  const contentW = pageW - marginL - marginR;
  let y = marginT;

  const checkBreak = (needed: number) => {
    if (y + needed > pageH - marginB) {
      doc.addPage();
      y = marginT;
    }
  };

  // line height: 1pt ≈ 0.352mm; multiply by 1.4 for comfortable reading
  const ptToMm = (pt: number) => pt * 0.352 * 1.45;

  const addText = (text: string, fontSize: number, bold = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW);
    const lineH = ptToMm(fontSize);
    checkBreak(lines.length * lineH + 3);
    doc.text(lines, marginL, y);
    y += lines.length * lineH + 2.5;
    doc.setTextColor(0, 0, 0);
  };

  const addDivider = () => {
    checkBreak(6);
    doc.setDrawColor(200, 200, 200);
    doc.line(marginL, y, pageW - marginR, y);
    y += 5;
  };

  // ── Capa ──────────────────────────────────────────────────────────────────
  if (hospitalLogoUrl) {
    try {
      const resp = await fetch(hospitalLogoUrl);
      const blob = await resp.blob();
      const b64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      doc.addImage(b64, blob.type.includes("png") ? "PNG" : "JPEG", marginL, marginT, 40, 15);
    } catch (_) { /* logo opcional */ }
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 45, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RELATÓRIO GERENCIAL DE AUDITORIAS DO SETOR", pageW / 2, 56, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${auditTypeName} — ${sectorName}`, pageW / 2, 64, { align: "center" });
  doc.text(`${hospitalName} — Período: ${period}`, pageW / 2, 70, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y = 85;
  addText("ABNT NBR 14724:2011 — Classificação: Interno", 8, false, [100, 100, 100]);
  y += 4;
  addDivider();

  // ── Indicadores principais ────────────────────────────────────────────────
  addText("INDICADORES PRINCIPAIS", 12, true, [37, 99, 235]);
  y += 2;
  const r = metrics.generalComplianceRate;
  const kpis: [string, string][] = [
    ["Conformidade Geral", `${r}%`],
    ["Total de Auditorias", `${metrics.totalAudits}`],
    ["Itens Conformes", `${metrics.compliantItems}`],
    ["Itens Não Conformes", `${metrics.nonCompliantItems}`],
    ["Classificação", r >= 95 ? "Excelente" : r >= 85 ? "Bom" : r >= 70 ? "Regular" : "Crítico"],
  ];
  kpis.forEach(([label, value]) => {
    checkBreak(8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", marginL, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, marginL + 70, y);
    y += 7;
  });
  y += 4;
  addDivider();

  // ── Conteúdo textual do markdown ─────────────────────────────────────────
  // Constante de espaçamento de linha para 8pt: ≈ 3.5mm por linha
  const LINE_H_8 = 3.8;
  const LINE_H_10 = 4.8;

  for (const line of markdownContent.split("\n")) {
    const t = line.trim();
    if (!t || t === "---") { y += 1.5; continue; }
    if (t.startsWith("[LOGO") || t.startsWith("___") || t.startsWith("![")) continue;

    if (t.startsWith("# ")) {
      y += 2;
      addText(t.slice(2), 13, true, [37, 99, 235]);
    } else if (t.startsWith("## ")) {
      y += 3;
      addText(t.slice(3), 11, true, [30, 64, 175]);
    } else if (t.startsWith("### ")) {
      y += 1;
      addText(t.slice(4), 10, true, [55, 65, 81]);
    } else if (t.startsWith("|")) {
      // ── Tabela Markdown ──────────────────────────────────────────────────
      const cells = t.split("|").filter(c => c.trim()).map(c => c.trim());
      // Linha separadora (--- ou :---:)
      if (cells.every(c => /^[-: ]+$/.test(c))) continue;

      const isHeader = cells.some(c => /^\*\*/.test(c));
      const cellW = contentW / Math.max(cells.length, 1);

      doc.setFontSize(8);
      doc.setFont("helvetica", isHeader ? "bold" : "normal");

      // Calcula o máximo de linhas nas células (para definir a altura da linha)
      const wrappedCells = cells.map(c => {
        const stripped = c.replace(/\*\*([^*]+)\*\*/g, "$1");
        return doc.splitTextToSize(stripped, cellW - 4);
      });
      const maxLines = Math.max(...wrappedCells.map(l => l.length), 1);
      const rowH = maxLines * LINE_H_8 + 3; // padding top+bottom

      checkBreak(rowH + 1);
      doc.setTextColor(0, 0, 0);
      if (isHeader) {
        doc.setFillColor(240, 245, 255);
        doc.rect(marginL, y - LINE_H_8, contentW, rowH, "F");
      }
      wrappedCells.forEach((cellLines, ci) => {
        doc.text(cellLines, marginL + ci * cellW + 2, y);
      });
      y += rowH;

    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      const plain = t.slice(2).replace(/\*\*([^*]+)\*\*/g, "$1");
      addText("• " + plain, 9.5);
    } else if (/^\d+\. /.test(t)) {
      addText(t.replace(/\*\*([^*]+)\*\*/g, "$1"), 9.5);
    } else if (t.startsWith(">")) {
      const txt = t.slice(1).trim().replace(/\*\*/g, "");
      const quoteLs = doc.splitTextToSize(txt, contentW - 6);
      const quoteH = quoteLs.length * LINE_H_10 + 4;
      checkBreak(quoteH);
      doc.setFillColor(239, 246, 255);
      doc.rect(marginL, y - LINE_H_10 + 1, contentW, quoteH, "F");
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(30, 64, 175);
      doc.text(quoteLs, marginL + 3, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      y += quoteH;
    } else {
      const plain = t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
      addText(plain, 9.5);
    }
  }

  // ── Página de gráficos ────────────────────────────────────────────────────
  if (chartsContainerRef.current) {
    const chartIds = mode === "monthly_sector_compiled"
      ? ["chart-overall", "chart-category", "chart-noncompliance", "chart-trend", "chart-by-type"]
      : ["chart-overall", "chart-category", "chart-sector", "chart-noncompliance", "chart-trend"];

    const chartTitles: Record<string, string> = {
      "chart-overall": "Conformidade Geral",
      "chart-category": "Conformidade por Categoria",
      "chart-sector": "Conformidade por Setor",
      "chart-noncompliance": "Principais Não Conformidades",
      "chart-trend": "Evolução Mensal da Conformidade",
      "chart-by-type": "Conformidade por Tipo de Auditoria",
    };

    doc.addPage();
    y = marginT;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, y - 5, pageW, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("GRÁFICOS DO RELATÓRIO", pageW / 2, y + 3, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 16;

    const maxChartH = pageH - marginT - marginB - 20; // máx por gráfico ≈ 232mm

    for (const chartId of chartIds) {
      const el = chartsContainerRef.current.querySelector(`#${chartId}`) as HTMLElement | null;
      if (!el) continue;
      try {
        const canvas = await html2canvas(el, {
          scale: 1.5,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
        });
        if (canvas.width === 0 || canvas.height === 0) continue;
        const imgData = canvas.toDataURL("image/jpeg", 0.88);

        // Calcula dimensões mantendo proporção, limitando à página
        let imgW = contentW;
        let imgH = (canvas.height / canvas.width) * imgW;
        if (imgH > maxChartH) {
          imgH = maxChartH;
          imgW = (canvas.width / canvas.height) * imgH;
        }

        const titleH = 8;
        checkBreak(imgH + titleH + 8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 64, 175);
        doc.text(chartTitles[chartId] || chartId, marginL, y);
        doc.setTextColor(0, 0, 0);
        y += titleH;
        // Centraliza se imgW < contentW
        const xOffset = marginL + (contentW - imgW) / 2;
        doc.addImage(imgData, "JPEG", xOffset, y, imgW, imgH);
        y += imgH + 10;
      } catch (e) {
        console.warn("Captura do gráfico falhou:", chartId, e);
      }
    }
  }

  // ── Numerar todas as páginas ──────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(`Página ${i} de ${total}`, pageW - marginR, pageH - 8, { align: "right" });
    doc.text(`IRAS Control — ${hospitalName}`, marginL, pageH - 8);
  }

  if (params.outputMode === "base64") {
    const dataUri = doc.output("datauristring") as string;
    return dataUri.split(",")[1]; // retorna apenas a parte base64
  }
  doc.save(`relatorio-auditoria-${Date.now()}.pdf`);
}
