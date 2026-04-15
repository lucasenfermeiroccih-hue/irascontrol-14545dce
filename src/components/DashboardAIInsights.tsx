import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DashboardAIInsightsProps {
  /** Local fallback insights generator — also used as context for AI */
  generateInsights: () => string[];
  /** Page title for AI context */
  pageTitle?: string;
}

export default function DashboardAIInsights({
  generateInsights,
  pageTitle = "Dashboard",
}: DashboardAIInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);

    // Generate local insights first — used as context for AI
    const localInsights = generateInsights();
    const contextData = localInsights.join("\n");

    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { context: contextData, pageTitle },
      });

      if (error) throw error;

      if (data?.insights && data.insights.length > 0) {
        setInsights(data.insights);
        setOpen(true);
        setLoading(false);
        toast.success("Insights gerados com IA!");
        return;
      }
    } catch (err: any) {
      console.warn("AI insights failed, falling back to local:", err);
      if (err?.message?.includes("429") || err?.context?.statusCode === 429) {
        toast.error("Limite de requisições excedido. Tente novamente em alguns minutos.");
      } else if (err?.message?.includes("402") || err?.context?.statusCode === 402) {
        toast.error("Créditos de IA esgotados. Adicione créditos no workspace.");
      }
    }

    // Fallback: local insights
    setInsights(localInsights);
    setOpen(true);
    setLoading(false);
    toast.success("Insights gerados com sucesso!");
  };

  return (
    <>
      <Button variant="outline" onClick={handleGenerate} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Insights IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Insights Inteligentes
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {insights.map((line, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start p-3 rounded-lg border bg-muted/30"
                >
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{line}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
