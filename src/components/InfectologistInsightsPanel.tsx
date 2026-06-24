import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope, Loader2, RefreshCw, AlertTriangle,
  TrendingUp, Lightbulb, Sparkles, ShieldAlert, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Maps infection control domains to the best agent for analysis
const DOMAIN_AGENTS: Record<string, string> = {
  "Higiene das Mãos": "sugestor-intervencoes",
  "ISC": "isc-analyst",
  "DDD": "sugestor-intervencoes",
  "Resistência Antimicrobiana": "sugestor-intervencoes",
  "Infecção Hospitalar": "risk-detector",
  "Indicadores Operacionais": "analisador-de-tendencias",
};

const DOMAIN_PROMPT: Record<string, string> = {
  "Higiene das Mãos": "Analise os indicadores de adesão à higiene das mãos e forneça uma análise infectológica com alertas de risco, tendências de conformidade e recomendações baseadas em evidências (OMS/ANVISA) para melhorar a adesão.",
  "ISC": "Analise os indicadores de Infecção de Sítio Cirúrgico (ISC) e elabore uma avaliação infectológica completa com alertas epidemiológicos, tendências de taxa de ISC e recomendações do bundle de prevenção.",
  "DDD": "Analise o consumo de antimicrobianos (DDD) e forneça análise de stewardship antimicrobiano com alertas de uso excessivo, tendências de consumo por unidade e recomendações para otimizar a terapia antimicrobiana.",
  "Resistência Antimicrobiana": "Analise o perfil de sensibilidade/resistência antimicrobiana e forneça análise infectológica com alertas de fenótipos críticos (KPC, MRSA, ESBL), tendências de resistência e recomendações de stewardship e controle de infecção.",
  "Infecção Hospitalar": "Analise os indicadores epidemiológicos de infecção hospitalar (taxas de infecção, dispositivos invasivos, letalidade) e forneça avaliação infectológica com alertas críticos, tendências de IRAS e recomendações de intervenção prioritária.",
  "Indicadores Operacionais": "Analise os indicadores operacionais de pacientes internados (admissões, dispositivos invasivos, antimicrobianos, óbitos) e forneça avaliação infectológica com alertas de risco, tendências assistenciais e recomendações para melhoria da segurança do paciente.",
};

type InsightKind = "alert" | "trend" | "tip" | "info";

function classify(line: string): InsightKind {
  const l = line.toLowerCase();
  if (/🚨|⚠️|alerta|urgent|crítico|critico|acima|excede|risco|surto|resistente|fenótipo/.test(l)) return "alert";
  if (/📈|📉|tendência|tendencia|aument|diminu|queda|crescimento|evolução|redução/.test(l)) return "trend";
  if (/💡|recomend|sugest|consider|interven|ação|acao|implement|melhor|bundle|protocolo|treinamento/.test(l)) return "tip";
  return "info";
}

const KIND_META: Record<InsightKind, { icon: any; color: string; bg: string; border: string; label: string }> = {
  alert: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/30", label: "Alerta Infectológico" },
  trend: { icon: TrendingUp, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/30", label: "Tendência Epidemiológica" },
  tip: { icon: Lightbulb, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/30", label: "Recomendação Clínica" },
  info: { icon: Activity, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", label: "Análise" },
};

// Parses agent-chat markdown or plain strings into display lines
function parseToLines(raw: string): string[] {
  return raw
    .split("\n")
    .map(l => l.replace(/^#+\s*/, "").replace(/^\*{1,2}(.+?)\*{1,2}$/, "$1").replace(/^-\s+/, "").trim())
    .filter(l => l.length > 20 && !/^```/.test(l));
}

interface InfectologistInsightsPanelProps {
  /** Infection control domain label */
  domain: string;
  /** Returns rich clinical context string for AI analysis */
  buildContext: () => string;
  /** Stable key to re-trigger analysis on data change */
  contextKey?: string;
  /** Auto-load on mount (default true) */
  autoLoad?: boolean;
}

export default function InfectologistInsightsPanel({
  domain,
  buildContext,
  contextKey,
  autoLoad = true,
}: InfectologistInsightsPanelProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"agent" | "ai" | "local" | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const lastKey = useRef<string | undefined>(undefined);

  const agentId = DOMAIN_AGENTS[domain] ?? "sugestor-intervencoes";
  const basePrompt = DOMAIN_PROMPT[domain] ?? `Analise os indicadores de ${domain} e forneça uma avaliação infectológica detalhada.`;

  const load = async () => {
    setLoading(true);
    const ctx = buildContext();

    // 1. Try agent-chat (Claude Sonnet) with domain-specific agent
    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          agent_id: agentId,
          input: `${basePrompt}\n\nDados atuais:\n${ctx}`,
          context: { domain, summary: ctx },
        },
      });
      if (!error && data?.output && data.output.length > 50) {
        const lines = parseToLines(data.output);
        if (lines.length >= 2) {
          setInsights(lines.slice(0, 8));
          setSource("agent");
          setGeneratedAt(new Date());
          setLoading(false);
          return;
        }
      }
    } catch (e: any) {
      if (e?.context?.statusCode === 429 || e?.message?.includes("429")) {
        toast.error("Limite de IA atingido. Tentando análise alternativa…");
      }
    }

    // 2. Fall back to generate-insights (Gemini)
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: {
          context: `Infectologista — ${domain}:\n${ctx}`,
          pageTitle: `Análise Infectológica: ${domain}`,
        },
      });
      if (!error && data?.insights && data.insights.length > 0) {
        setInsights(data.insights.slice(0, 8));
        setSource("ai");
        setGeneratedAt(new Date());
        setLoading(false);
        return;
      }
    } catch (e: any) {
      if (e?.context?.statusCode === 402 || e?.message?.includes("402")) {
        toast.error("Créditos de IA esgotados. Mostrando análise local.");
      }
    }

    // 3. Final fallback: local rule-based analysis from context
    const local = ctx.split("\n").filter(l => l.includes(":") && l.length > 15).slice(0, 6).map(l => `📊 ${l}`);
    setInsights(local.length > 0 ? local : [`📋 Sem dados suficientes para análise infectológica de ${domain}.`]);
    setSource("local");
    setGeneratedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    if (!autoLoad) return;
    if (lastKey.current === contextKey) return;
    lastKey.current = contextKey;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, autoLoad]);

  const sourceBadge = source === "agent"
    ? <Badge variant="secondary" className="gap-1 text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200"><Sparkles className="h-3 w-3" /> Claude · Infectologista IA</Badge>
    : source === "ai"
    ? <Badge variant="secondary" className="gap-1 text-[10px]"><Sparkles className="h-3 w-3" /> IA Gemini</Badge>
    : source === "local"
    ? <Badge variant="outline" className="text-[10px]">Análise local</Badge>
    : null;

  return (
    <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/60 via-background to-background dark:from-emerald-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              <Stethoscope className="h-4.5 w-4.5 h-[18px] w-[18px] text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-semibold">Infectologista IA</span>
              <p className="text-[11px] font-normal text-muted-foreground leading-tight">Parecer clínico especializado · {domain}</p>
            </div>
            {sourceBadge && <div className="ml-1">{sourceBadge}</div>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {generatedAt && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="gap-1.5 h-8 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {loading ? "Consultando..." : "Atualizar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && insights.length === 0 ? (
          <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            <span>Consultando Infectologista IA — analisando indicadores clínicos…</span>
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum dado disponível para análise infectológica.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {insights.map((line, i) => {
              const kind = classify(line);
              const meta = KIND_META[kind];
              const Icon = meta.icon;
              return (
                <div
                  key={i}
                  className={`flex gap-2.5 items-start p-3 rounded-lg border ${meta.bg} ${meta.border} transition-colors`}
                >
                  <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 bg-background border ${meta.border}`}>
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${meta.color}`}>
                      {meta.label}
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">{line.replace(/^[📊📈📉⚠️🚨💡✅🔴🟡🟢📋🦠💉🔬🏥]\s*/, "")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
