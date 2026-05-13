import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import { DDDRegistroMensal } from "@/data/antimicrobianos-ddd";
import { generateAIReport, generateAIInsights, generateAIAlerts, AIAnalysisInput } from "@/lib/ddd-ai-engine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  filtered: DDDRegistroMensal[];
  all: DDDRegistroMensal[];
  filtroMes: string;
  filtroAno: string;
}

function buildDDDSummary(filtered: DDDRegistroMensal[], filtroMes: string, filtroAno: string) {
  const byAtm: Record<string, number> = {};
  const byUnit: Record<string, number> = {};
  let totalIndicador = 0;
  filtered.forEach(d => {
    byAtm[d.antimicrobiano] = (byAtm[d.antimicrobiano] || 0) + d.totalG;
    byUnit[d.unidade] = (byUnit[d.unidade] || 0) + d.indicadorConsumo;
    totalIndicador += d.indicadorConsumo;
  });
  return {
    periodo: `${filtroMes !== "all" ? filtroMes : "Todos os meses"} / ${filtroAno !== "all" ? filtroAno : "Todos os anos"}`,
    total_registros: filtered.length,
    total_indicador: Math.round(totalIndicador * 100) / 100,
    media_indicador: filtered.length ? Math.round((totalIndicador / filtered.length) * 100) / 100 : 0,
    top_antimicrobianos: Object.entries(byAtm).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, g]) => ({ nome, total_g: Math.round(g * 100) / 100 })),
    consumo_por_unidade: Object.entries(byUnit).sort((a, b) => b[1] - a[1]).map(([unidade, indicador]) => ({ unidade, indicador: Math.round(indicador * 100) / 100 })),
    registros_criticos: filtered.filter(d => d.indicadorConsumo > 50).length,
    registros_altos: filtered.filter(d => d.indicadorConsumo > 30 && d.indicadorConsumo <= 50).length,
  };
}

export default function AIAssistenteDDD({ filtered, all, filtroMes, filtroAno }: Props) {
  const [activeTab, setActiveTab] = useState("relatorio");
  const [output, setOutput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const input: AIAnalysisInput = { filtered, all, filtroMes, filtroAno };

  const generate = useCallback(async (type: "relatorio" | "insights" | "alertas") => {
    setLoading(true);
    setActiveTab(type);

    const typeLabel = { relatorio: "Gere um relatório completo", insights: "Gere insights analíticos", alertas: "Gere alertas priorizados" }[type];
    const dddSummary = buildDDDSummary(filtered, filtroMes, filtroAno);

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          agent_id: "ddd-analyst",
          input: `${typeLabel} sobre os dados de consumo de antimicrobianos (DDD) do período. Tipo de saída solicitado: ${type}.`,
          context: { ddd_summary: dddSummary },
        },
      });

      if (error) throw error;
      if (data?.output) {
        setOutput(prev => ({ ...prev, [type]: data.output }));
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Edge function falhou, usando análise local:", err);
      toast.warning("Usando análise local — IA indisponível no momento.");
    }

    // Fallback: template local
    let result: string;
    switch (type) {
      case "relatorio": result = generateAIReport(input); break;
      case "insights": result = generateAIInsights(input); break;
      case "alertas": result = generateAIAlerts(input); break;
    }
    setOutput(prev => ({ ...prev, [type]: result }));
    setLoading(false);
  }, [filtered, filtroMes, filtroAno, input]);

  const handleCopy = useCallback(() => {
    const text = output[activeTab];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Texto copiado!");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output, activeTab]);

  const currentOutput = output[activeTab] || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" /> Agente de IA — Análise DDD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => generate("relatorio")} disabled={loading} className="gap-2">
            {loading && activeTab === "relatorio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar Relatório
          </Button>
          <Button variant="outline" onClick={() => generate("insights")} disabled={loading} className="gap-2">
            {loading && activeTab === "insights" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar Insights
          </Button>
          <Button variant="outline" onClick={() => generate("alertas")} disabled={loading} className="gap-2">
            {loading && activeTab === "alertas" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Gerar Alertas
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando dados... Processando {filtered.length} registros.
          </div>
        )}

        {!loading && (output.relatorio || output.insights || output.alertas) && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                {output.relatorio && <TabsTrigger value="relatorio">Relatório</TabsTrigger>}
                {output.insights && <TabsTrigger value="insights">Insights</TabsTrigger>}
                {output.alertas && <TabsTrigger value="alertas">Alertas</TabsTrigger>}
              </TabsList>
              {currentOutput && (
                <Button size="sm" variant="ghost" onClick={handleCopy} className="gap-1.5 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              )}
            </div>

            {["relatorio", "insights", "alertas"].map(tab => (
              <TabsContent key={tab} value={tab}>
                {output[tab] && (
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                      {output[tab]}
                    </pre>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
