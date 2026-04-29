import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, RefreshCw, Brain, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SmartInsightsPanelProps {
  /** Function that generates the local data context (used as input for the AI). */
  generateInsights: () => string[];
  /** Page title used as context for the AI. */
  pageTitle?: string;
  /** Auto-load on mount + when context changes. Default true. */
  autoLoad?: boolean;
  /** Stable key to detect when underlying data changes (e.g. filters hash). */
  contextKey?: string;
}

type InsightKind = "alert" | "trend" | "tip" | "info";

function classify(line: string): InsightKind {
  const l = line.toLowerCase();
  if (/🚨|alerta|urgent|crítico|critico|acima|excede|risco/.test(l)) return "alert";
  if (/📈|📉|tendência|tendencia|aument|diminu|queda|crescimento/.test(l)) return "trend";
  if (/💡|recomenda|sugest|consider|ação|acao|implement|melhor/.test(l)) return "tip";
  return "info";
}

const KIND_META: Record<InsightKind, { icon: any; color: string; bg: string; border: string; label: string }> = {
  alert: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/30", label: "Alerta" },
  trend: { icon: TrendingUp, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/30", label: "Tendência" },
  tip: { icon: Lightbulb, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/30", label: "Recomendação" },
  info: { icon: Sparkles, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", label: "Insight" },
};

export default function SmartInsightsPanel({
  generateInsights,
  pageTitle = "Dashboard",
  autoLoad = true,
  contextKey,
}: SmartInsightsPanelProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedAI, setUsedAI] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const lastKey = useRef<string | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    const local = generateInsights();
    const contextData = local.join("\n");
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { context: contextData, pageTitle },
      });
      if (error) throw error;
      if (data?.insights && data.insights.length > 0) {
        setInsights(data.insights);
        setUsedAI(true);
        setGeneratedAt(new Date());
        setLoading(false);
        return;
      }
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.context?.statusCode === 429) {
        toast.error("Limite de IA atingido. Mostrando análise local.");
      } else if (err?.message?.includes("402") || err?.context?.statusCode === 402) {
        toast.error("Créditos de IA esgotados. Mostrando análise local.");
      }
    }
    setInsights(local);
    setUsedAI(false);
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

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            Insights Inteligentes
            {usedAI ? (
              <Badge variant="secondary" className="ml-1 gap-1 text-[10px]">
                <Sparkles className="h-3 w-3" /> IA
              </Badge>
            ) : (
              insights.length > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  Análise local
                </Badge>
              )
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {generatedAt && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Atualizado às {generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {loading ? "Analisando..." : "Atualizar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && insights.length === 0 ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analisando indicadores com IA...
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum dado disponível para gerar insights.
          </p>
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
                    <p className="text-sm leading-relaxed text-foreground">{line}</p>
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
