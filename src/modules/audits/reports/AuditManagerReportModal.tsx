import { useState, useRef, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Copy, Download, FileText, ArrowLeft, CheckCircle, ImageIcon, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import type { AuditReportMode, AuditManagerReportMetrics, MonthlySectorCompiledAuditMetrics } from "./auditReportTypes";
import { fetchAuditsForReport, fetchHospitalLogos, generateAIReportSections } from "./auditReportService";
import { calculateAuditManagerReportMetrics, calculateMonthlySectorCompiledAuditReport } from "./auditReportMetrics";
import {
  generateAuditManagerReportMarkdown,
  generateMonthlySectorCompiledMarkdown,
  getAuditTypeName,
} from "./auditReportMarkdown";
import { AuditReportChartsRenderer, AuditReportChartsPreview, generateReportPdfWithCharts } from "./auditReportCharts";
import type { AuditRecord, AuditItemRecord } from "./auditReportTypes";

const AUDIT_TYPE_OPTIONS = [
  { value: "bundles", label: "Bundles CVC/SVD" },
  { value: "hand_hygiene", label: "Higienização das Mãos" },
  { value: "infection_control", label: "Controle de Infecção" },
  { value: "dispenser", label: "Dispensadores" },
  { value: "cti_infrastructure", label: "Infraestrutura CTI" },
  { value: "precaution", label: "Precauções e Isolamento" },
  { value: "hand_hygiene_consumption", label: "Consumo de Produtos de Higienização" },
  { value: "construction_renovation", label: "Obras e Reformas" },
  { value: "antibiogram", label: "Antibiograma" },
];

export interface AuditManagerReportModalProps {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
  hospitalName: string;
  availableSectors: string[];
  defaultAuditType?: string;
  defaultMode?: AuditReportMode;
}

type Step = "form" | "preview";

export function AuditManagerReportModal({
  open, onClose, hospitalId, hospitalName, availableSectors, defaultAuditType, defaultMode,
}: AuditManagerReportModalProps) {
  // Form state
  const [mode, setMode] = useState<AuditReportMode>(defaultMode ?? "single_audit_type");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectorSearch, setSectorSearch] = useState("");
  const [auditType, setAuditType] = useState(defaultAuditType ?? "bundles");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 7));
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [technicalResponsible, setTechnicalResponsible] = useState("");
  const [includeActionPlan, setIncludeActionPlan] = useState(true);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [markdownContent, setMarkdownContent] = useState("");
  const [generatedAudits, setGeneratedAudits] = useState<AuditRecord[]>([]);
  const [generatedItems, setGeneratedItems] = useState<AuditItemRecord[]>([]);
  const [generatedMetrics, setGeneratedMetrics] = useState<AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics | null>(null);
  const [generatedMode, setGeneratedMode] = useState<AuditReportMode>("single_audit_type");
  const [generatedHospitalLogoUrl, setGeneratedHospitalLogoUrl] = useState<string | undefined>();
  const [pdfLoading, setPdfLoading] = useState(false);

  // E-mail dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailMgrName, setEmailMgrName] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  const chartsRef = useRef<HTMLDivElement>(null);

  // Sector selection helpers
  const filteredSectors = useMemo(
    () => availableSectors.filter(s => s.toLowerCase().includes(sectorSearch.toLowerCase())),
    [availableSectors, sectorSearch]
  );

  const toggleSector = (s: string) =>
    setSelectedSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const selectAll = () => setSelectedSectors([...availableSectors]);
  const clearAll = () => setSelectedSectors([]);

  // Period → YYYY-MM-DD conversion
  const periodStartDate = `${periodStart}-01`;
  const periodEndDate = (() => {
    const [y, m] = periodEnd.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${periodEnd}-${String(last).padStart(2, "0")}`;
  })();

  const handleGenerate = useCallback(async () => {
    if (selectedSectors.length === 0) {
      toast.error("Selecione pelo menos um setor.");
      return;
    }
    if (mode === "single_audit_type" && !auditType) {
      toast.error("Selecione o tipo de auditoria.");
      return;
    }

    setLoading(true);
    try {
      setLoadingMsg("Buscando dados das auditorias...");
      const { audits, items } = await fetchAuditsForReport({
        hospitalId,
        sectors: selectedSectors,
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        auditType: mode === "single_audit_type" ? auditType : undefined,
      });

      if (audits.length === 0) {
        toast.warning("Nenhuma auditoria encontrada no período e setor selecionados.");
        setLoading(false);
        return;
      }

      setLoadingMsg("Calculando métricas...");
      const metrics = mode === "single_audit_type"
        ? calculateAuditManagerReportMetrics({ audits, items })
        : calculateMonthlySectorCompiledAuditReport({ audits, items });

      setLoadingMsg("Gerando análise com IA...");
      const auditTypeName = mode === "single_audit_type" ? getAuditTypeName(auditType) : "Compilado Mensal";
      const period = `${periodStart} a ${periodEnd}`;
      const aiSections = await generateAIReportSections({
        metrics: metrics as any,
        auditTypeName,
        sectorName: selectedSectors.join(", "),
        period,
        mode,
      });

      setLoadingMsg("Gerando relatório...");
      const generatedAt = new Date().toLocaleString("pt-BR");

      let md: string;
      if (mode === "single_audit_type") {
        md = generateAuditManagerReportMarkdown({
          hospitalName,
          sectorName: selectedSectors.join(", "),
          auditType,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
          managerName: managerName || undefined,
          managerEmail: managerEmail || undefined,
          technicalResponsible: technicalResponsible || undefined,
          generatedAt,
          metrics: metrics as AuditManagerReportMetrics,
        });
      } else {
        md = generateMonthlySectorCompiledMarkdown({
          hospitalName,
          sectorNames: selectedSectors,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
          managerName: managerName || undefined,
          managerEmail: managerEmail || undefined,
          technicalResponsible: technicalResponsible || undefined,
          generatedAt,
          metrics: metrics as MonthlySectorCompiledAuditMetrics,
        });
      }

      // Inject AI sections into markdown placeholders
      md = md
        .replace("{{resultsDiscussion}}", aiSections.resultsDiscussion)
        .replace("{{chartDiscussions}}", aiSections.chartDiscussions)
        .replace("{{probableCauseAnalysis}}", aiSections.probableCauseAnalysis)
        .replace("{{riskAnalysis}}", aiSections.riskAnalysis)
        .replace("{{managerRecommendations}}", aiSections.managerRecommendations)
        .replace("{{nextCycleGoals}}", aiSections.nextCycleGoals)
        .replace("{{conclusion}}", aiSections.conclusion)
        .replace("{{integratedSectorDiscussion}}", aiSections.integratedSectorDiscussion || "")
        .replace("{{teamMeetingAgenda}}", aiSections.teamMeetingAgenda);

      // Fetch logos
      const logos = await fetchHospitalLogos(hospitalId);
      const hospLogo = logos.find(l => l.logo_type === "hospital" || l.logo_type === "main");
      const scihLogo = logos.find(l => l.logo_type === "scih" || l.logo_type === "ccih");
      if (hospLogo) md = md.replace("[LOGO DO HOSPITAL]", `![Logo do Hospital](${hospLogo.url})`);
      if (scihLogo) md = md.replace("[LOGO DA SCIH/CCIH]", `![Logo da SCIH](${scihLogo.url})`);

      setMarkdownContent(md);
      setGeneratedAudits(audits);
      setGeneratedItems(items);
      setGeneratedMetrics(metrics as any);
      setGeneratedMode(mode);
      setGeneratedHospitalLogoUrl(hospLogo?.url);
      setStep("preview");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar relatório: " + (err?.message || "Tente novamente."));
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }, [hospitalId, hospitalName, selectedSectors, mode, auditType, periodStart, periodEnd, periodStartDate, periodEndDate, managerName, managerEmail, technicalResponsible, includeActionPlan]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent).then(() => toast.success("Markdown copiado!"));
  };

  const handleDownloadMd = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-auditoria-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo .md baixado!");
  };

  const handleDownloadPdfText = async () => {
    try {
      setPdfLoading(true);
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210; const marginL = 30; const marginR = 20; const marginT = 30; const marginB = 20;
      const contentW = pageW - marginL - marginR;
      let y = marginT;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("RELATÓRIO GERENCIAL DE AUDITORIAS DO SETOR", pageW / 2, y, { align: "center" });
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(hospitalName, pageW / 2, y, { align: "center" });
      y += 15;

      const lines = markdownContent.split("\n");
      for (const line of lines) {
        const t = line.trim();
        if (!t || t === "---" || t.startsWith("[LOGO") || t.startsWith("___")) { y += 1; continue; }
        const isH1 = t.startsWith("# "); const isH2 = t.startsWith("## "); const isH3 = t.startsWith("### ");
        const plain = t.replace(/^#{1,3}\s/, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\|/g, " | ");
        const fs = isH1 ? 13 : isH2 ? 11 : isH3 ? 10 : 9;
        const bold = isH1 || isH2 || isH3;
        doc.setFontSize(fs);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        const wrapped = doc.splitTextToSize(plain, contentW);
        const lh = fs * 0.45;
        if (y + wrapped.length * lh > 297 - marginB) { doc.addPage(); y = marginT; }
        doc.text(wrapped, marginL, y);
        y += wrapped.length * lh + (isH1 ? 4 : isH2 ? 3 : 2);
      }
      doc.save(`relatorio-auditoria-texto-${Date.now()}.pdf`);
      toast.success("PDF (texto) exportado!");
    } catch (e: any) {
      toast.error("Erro ao exportar PDF: " + e?.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdfWithCharts = async () => {
    if (!generatedMetrics) return;
    setPdfLoading(true);
    try {
      await generateReportPdfWithCharts({
        chartsContainerRef: chartsRef,
        markdownContent,
        hospitalName,
        sectorName: selectedSectors.join(", "),
        auditTypeName: mode === "single_audit_type" ? getAuditTypeName(auditType) : "Compilado Mensal",
        period: `${periodStart} a ${periodEnd}`,
        hospitalLogoUrl: generatedHospitalLogoUrl,
        metrics: generatedMetrics,
        mode: generatedMode,
      });
      toast.success("PDF com gráficos exportado!");
    } catch (e: any) {
      toast.error("Erro ao exportar PDF com gráficos: " + e?.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOpenEmail = () => {
    setEmailTo(managerEmail);
    setEmailMgrName(managerName);
    setEmailCc("");
    setEmailOpen(true);
  };

  const handleSendReportEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const to = emailTo.trim();
    if (!emailRegex.test(to)) {
      toast.error("Informe um e-mail válido para o destinatário.");
      return;
    }
    if (!generatedMetrics) return;

    const ccList = emailCc.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const invalidCc = ccList.filter(e => !emailRegex.test(e));
    if (invalidCc.length > 0) {
      toast.error("E-mail(s) de cópia inválido(s): " + invalidCc.join(", "));
      return;
    }

    setEmailSending(true);
    try {
      toast.info("Gerando PDF e enviando e-mail, aguarde...");

      const auditTypeName = generatedMode === "single_audit_type" ? getAuditTypeName(auditType) : "Compilado Mensal";
      const period = `${periodStart} a ${periodEnd}`;

      // Gera PDF como base64 (sem salvar no disco)
      const pdfBase64 = await generateReportPdfWithCharts({
        chartsContainerRef: chartsRef,
        markdownContent,
        hospitalName,
        sectorName: selectedSectors.join(", "),
        auditTypeName,
        period,
        hospitalLogoUrl: generatedHospitalLogoUrl,
        metrics: generatedMetrics,
        mode: generatedMode,
        outputMode: "base64",
      });

      const { data, error } = await supabase.functions.invoke("send-audit-email", {
        body: {
          reportMode: true,
          to,
          cc: ccList,
          managerName: emailMgrName.trim(),
          reportPdfBase64: pdfBase64,
          markdownContent,
          hospitalName,
          sectorName: selectedSectors.join(", "),
          auditTypeName,
          period,
          metrics: {
            generalComplianceRate: generatedMetrics.generalComplianceRate,
            totalAudits: generatedMetrics.totalAudits,
            compliantItems: generatedMetrics.compliantItems,
            nonCompliantItems: generatedMetrics.nonCompliantItems,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Relatório enviado com sucesso para ${to}!`);
      setEmailOpen(false);
    } catch (e: any) {
      toast.error("Erro ao enviar e-mail: " + (e?.message || "tente novamente."));
    } finally {
      setEmailSending(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep("form");
      setMarkdownContent("");
      onClose();
    }
  };

  const handleBack = () => {
    setStep("form");
    setMarkdownContent("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {step === "form" ? "Gerar Relatório Gerencial de Auditoria" : "Preview do Relatório"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === "form"
              ? "Preencha os campos abaixo para gerar o relatório ABNT"
              : "Visualize, copie ou baixe o relatório gerado"}
          </DialogDescription>
        </DialogHeader>

        {/* ── FORM ── */}
        {step === "form" && (
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-5">
              {/* Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de relatório</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as AuditReportMode)} className="flex gap-4 flex-wrap">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single_audit_type" id="mode-single" />
                    <Label htmlFor="mode-single" className="cursor-pointer text-sm">Por tipo de auditoria</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly_sector_compiled" id="mode-compiled" />
                    <Label htmlFor="mode-compiled" className="cursor-pointer text-sm">Relatório mensal compilado do gestor</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Sectors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Setores</Label>
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground">{selectedSectors.length} selecionado(s)</span>
                    <button className="text-xs text-primary hover:underline" onClick={selectAll} type="button">Todos</button>
                    <button className="text-xs text-muted-foreground hover:underline" onClick={clearAll} type="button">Limpar</button>
                  </div>
                </div>
                <Input
                  placeholder="Buscar setor..."
                  value={sectorSearch}
                  onChange={e => setSectorSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1 bg-muted/30">
                  {filteredSectors.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">Nenhum setor encontrado.</p>
                  )}
                  {filteredSectors.map(s => (
                    <div key={s} className="flex items-center gap-2 py-0.5 hover:bg-background rounded px-1">
                      <Checkbox
                        id={`sector-${s}`}
                        checked={selectedSectors.includes(s)}
                        onCheckedChange={() => toggleSector(s)}
                      />
                      <Label htmlFor={`sector-${s}`} className="cursor-pointer text-sm font-normal">{s}</Label>
                    </div>
                  ))}
                </div>
                {selectedSectors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSectors.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleSector(s)}>
                        {s} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Period */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Período inicial</Label>
                  <Input type="month" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Período final</Label>
                  <Input type="month" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>

              {/* Audit type (only for single) */}
              {mode === "single_audit_type" && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Tipo de auditoria</Label>
                  <Select value={auditType} onValueChange={setAuditType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIT_TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Manager info */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-xs">Informações do gestor (opcional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="mgr-name" className="text-sm">Nome do gestor</Label>
                    <Input id="mgr-name" value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="Ex.: Dr. João Silva" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mgr-email" className="text-sm">E-mail do gestor</Label>
                    <Input id="mgr-email" type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="gestor@hospital.com" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tech" className="text-sm">Responsável técnico</Label>
                  <Input id="tech" value={technicalResponsible} onChange={e => setTechnicalResponsible(e.target.value)} placeholder="Ex.: Enfermeira CCIH" className="h-9 text-sm" />
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-2">
                <Checkbox id="action-plan" checked={includeActionPlan} onCheckedChange={v => setIncludeActionPlan(Boolean(v))} />
                <Label htmlFor="action-plan" className="text-sm cursor-pointer">Incluir plano de ação 5W2H sugerido</Label>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* ── PREVIEW ── */}
        {step === "preview" && generatedMetrics && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Hidden chart renderer for PDF capture */}
            <AuditReportChartsRenderer
              ref={chartsRef}
              audits={generatedAudits}
              items={generatedItems}
              metrics={generatedMetrics}
              mode={generatedMode}
            />

            <Tabs defaultValue="markdown" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-2 pb-0 border-b">
                <TabsList className="h-8">
                  <TabsTrigger value="markdown" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />Markdown
                  </TabsTrigger>
                  <TabsTrigger value="charts" className="text-xs">
                    <ImageIcon className="h-3 w-3 mr-1" />Gráficos
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="markdown" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full px-6 py-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-slate-50 rounded-lg p-4 border">
                    {markdownContent}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="charts" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full px-6 py-4">
                  <AuditReportChartsPreview
                    audits={generatedAudits}
                    items={generatedItems}
                    metrics={generatedMetrics}
                    mode={generatedMode}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── FOOTER ── */}
        <DialogFooter className="px-6 py-3 border-t gap-2 flex-wrap">
          {step === "form" ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleGenerate} disabled={loading || selectedSectors.length === 0}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{loadingMsg || "Gerando..."}</>
                ) : (
                  <><FileText className="h-4 w-4 mr-1" />Gerar Relatório</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />Voltar
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" />Copiar Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMd}>
                <Download className="h-4 w-4 mr-1" />Baixar .md
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdfText} disabled={pdfLoading || emailSending}>
                {pdfLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                PDF (texto)
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdfWithCharts} disabled={pdfLoading || emailSending}>
                {pdfLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                PDF com Gráficos
              </Button>
              <Button size="sm" onClick={handleOpenEmail} disabled={pdfLoading || emailSending}>
                <Mail className="h-4 w-4 mr-1" />
                Enviar por E-mail
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* ── DIÁLOGO DE E-MAIL ── */}
      <Dialog open={emailOpen} onOpenChange={(o) => { if (!emailSending) setEmailOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-primary" />
              Enviar Relatório por E-mail
            </DialogTitle>
            <DialogDescription className="text-xs">
              O PDF completo com gráficos será gerado e enviado como anexo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Para (e-mail do gestor) *</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="gestor@hospital.com"
                disabled={emailSending}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Cópia (CC) — separar por vírgula</Label>
              <Input
                value={emailCc}
                onChange={e => setEmailCc(e.target.value)}
                placeholder="outro@email.com, chefia@email.com"
                disabled={emailSending}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Nome do gestor</Label>
              <Input
                value={emailMgrName}
                onChange={e => setEmailMgrName(e.target.value)}
                placeholder="Dr. João Silva"
                disabled={emailSending}
              />
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Serão enviados em anexo: <strong>PDF com gráficos</strong> e <strong>relatório em texto (.md)</strong>.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(false)} disabled={emailSending}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSendReportEmail} disabled={emailSending}>
              {emailSending
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Enviando...</>
                : <><Mail className="h-4 w-4 mr-1" />Enviar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
