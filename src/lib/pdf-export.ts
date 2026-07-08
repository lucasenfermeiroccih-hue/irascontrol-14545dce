import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportPdfOptions {
  type: string;
  hospitalId: string;
  data: Record<string, unknown>;
  filenamePrefix?: string;
}

export async function exportPdf({ type, hospitalId, data, filenamePrefix }: ExportPdfOptions) {
  toast.info("Gerando PDF...");
  try {
    const { data: result, error } = await supabase.functions.invoke("generate-pdf", {
      body: { type, hospitalId, data },
    });

    if (error) throw error;
    if (!result?.pdf) throw new Error("PDF vazio");

    const byteArray = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const prefix = filenamePrefix || type;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}-${new Date().toISOString().split("T")[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("PDF exportado com sucesso!");
  } catch (err: any) {
    console.error("Erro ao gerar PDF:", err);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  }
}

/**
 * Captura um elemento HTML com html2canvas e exporta como PDF A4 multi-página.
 * Os gráficos Recharts e todo o conteúdo visual são preservados exatamente como
 * aparecem na tela.
 */
export async function captureElementAsPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  toast.info("Gerando PDF com gráficos...");
  try {
    const html2canvasLib = (await import("html2canvas")).default;
    const { default: jsPDF } = await import("jspdf");

    // Pequena pausa para garantir que animações dos gráficos terminaram
    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvasLib(element, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const margin = 10; // mm
    const pageW = 210; // A4 largura mm
    const pageH = 297; // A4 altura mm
    const usableW = pageW - 2 * margin;
    const usableH = pageH - 2 * margin;

    const imgW = usableW;
    const imgH = (canvas.height / canvas.width) * imgW;

    const pdf = new jsPDF({ unit: "mm", format: "a4" });

    let heightLeft = imgH;
    let sourceTop = 0;
    let pageNum = 0;

    while (heightLeft > 0) {
      if (pageNum > 0) pdf.addPage();

      const sliceImgH = Math.min(heightLeft, usableH);
      const srcY = Math.floor((sourceTop / imgH) * canvas.height);
      const srcH = Math.ceil((sliceImgH / imgH) * canvas.height);

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, sliceImgH);

      heightLeft -= usableH;
      sourceTop += usableH;
      pageNum++;
    }

    pdf.save(filename);
    toast.success("PDF exportado com sucesso!");
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  }
}
