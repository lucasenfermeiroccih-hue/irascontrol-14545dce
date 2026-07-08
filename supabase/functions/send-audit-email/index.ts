import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AuditItemPayload {
  question: string;
  status: string;
  observation?: string | null;
}

interface AuditPayload {
  typeLabel: string;
  date: string;
  sector?: string | null;
  complianceRate?: number | null;
  compliantItems?: number;
  totalItems?: number;
  observations?: string | null;
  items?: AuditItemPayload[];
}

const STATUS_LABEL: Record<string, string> = {
  compliant: "Conforme",
  non_compliant: "Não conforme",
  not_applicable: "Não se aplica",
};

const STATUS_COLOR: Record<string, string> = {
  compliant: "#16a34a",
  non_compliant: "#dc2626",
  not_applicable: "#6b7280",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: string): string {
  if (!d) return "—";
  const parts = d.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function buildAuditHtml(audit: AuditPayload): string {
  const items = audit.items || [];
  const rows = items.map((it) => {
    const color = STATUS_COLOR[it.status] || "#6b7280";
    const label = STATUS_LABEL[it.status] || it.status;
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;">${escapeHtml(it.question)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;color:${color};font-weight:600;white-space:nowrap;">${label}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;color:#374151;">${it.observation ? escapeHtml(it.observation) : "—"}</td>
    </tr>`;
  }).join("");

  const naoConformes = items.filter((it) => it.status === "non_compliant");
  const ncList = naoConformes.length > 0
    ? `<ul style="margin:8px 0 0;padding-left:18px;">${naoConformes.map((it) =>
        `<li style="font-size:13px;color:#374151;margin-bottom:4px;">${escapeHtml(it.question)}${it.observation ? ` — <em>${escapeHtml(it.observation)}</em>` : ""}</li>`,
      ).join("")}</ul>`
    : `<p style="font-size:13px;color:#16a34a;margin:8px 0 0;">Nenhuma não conformidade identificada nesta auditoria.</p>`;

  const compliance = typeof audit.complianceRate === "number" ? `${audit.complianceRate.toFixed(1)}%` : "—";

  return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0;background:#f9fafb;">
      <h3 style="margin:0 0 10px;font-size:15px;color:#111827;">Auditoria — ${escapeHtml(audit.typeLabel)}</h3>
      <table style="border-collapse:collapse;font-size:13px;color:#374151;margin-bottom:12px;">
        <tr><td style="padding:2px 12px 2px 0;"><strong>Data:</strong></td><td>${formatDate(audit.date)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;"><strong>Setor:</strong></td><td>${escapeHtml(audit.sector || "—")}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;"><strong>Conformidade:</strong></td><td>${compliance} (${audit.compliantItems ?? 0}/${audit.totalItems ?? items.length} itens conformes)</td></tr>
      </table>
      ${items.length > 0 ? `
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#eef2ff;">
            <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left;">Item avaliado</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left;">Situação</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left;">Observação</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>` : ""}
      ${audit.observations ? `<p style="font-size:13px;color:#374151;margin:12px 0 0;"><strong>Observações gerais:</strong> ${escapeHtml(audit.observations)}</p>` : ""}
      <h4 style="margin:16px 0 0;font-size:14px;color:#111827;">Não conformidades e pontos de melhoria</h4>
      ${ncList}
    </div>`;
}

function buildLogoHeaderHtml(hospitalLogoBase64?: string, scihLogosBase64?: string[]): string {
  if (!hospitalLogoBase64 && (!scihLogosBase64 || scihLogosBase64.length === 0)) return "";

  const hospImg = hospitalLogoBase64
    ? `<img src="cid:hospital-logo" alt="Logo Hospital" style="max-height:56px;max-width:160px;object-fit:contain;" />`
    : "";

  const scihImgs = (scihLogosBase64 || []).map((_, i) =>
    `<img src="cid:scih-logo-${i}" alt="Logo SCIH" style="max-height:56px;max-width:100px;object-fit:contain;margin-left:8px;" />`
  ).join("");

  return `<div style="padding:12px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:8px 8px 0 0;border-bottom:1px solid #e5e7eb;">
    <div>${hospImg}</div>
    <div style="display:flex;align-items:center;">${scihImgs}</div>
  </div>`;
}

function buildEmailHtml(managerName: string, audit: AuditPayload, photosHtml = "", logoHeaderHtml = ""): string {
  const p = "margin:0 0 12px;font-size:14px;line-height:1.6;color:#1f2937;";
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:680px;margin:0 auto;">
    ${logoHeaderHtml}
    <p style="${p}">Prezado(a) ${escapeHtml(managerName || "Gestor(a) do Setor")},</p>
    <p style="${p}">Espero que esteja bem.</p>
    <p style="${p}">Informo que foi realizada uma auditoria pelo Serviço de Controle de Infecção Hospitalar no setor sob sua responsabilidade, com o objetivo de avaliar a adesão às boas práticas assistenciais e institucionais relacionadas à prevenção e controle das infecções relacionadas à assistência à saúde.</p>
    <p style="${p}">A auditoria contempla os pontos como higienização das mãos, uso adequado de EPIs, cumprimento das precauções padrão e específicas, organização do ambiente, limpeza e desinfecção de superfícies, identificação de pacientes em isolamento, disponibilidade de insumos e conformidade com os protocolos institucionais vigentes.</p>
    <p style="${p}">Ressalto que a finalidade da auditoria é identificar oportunidades de melhoria, fortalecer a segurança do paciente e apoiar a equipe na padronização dos processos assistenciais.</p>
    <p style="${p}">Segue abaixo a auditoria.</p>
    ${buildAuditHtml(audit)}
    ${photosHtml}
    <p style="${p}">Após a avaliação, as não conformidades e pontos de melhoria são compartilhadas acima com a chefia do setor para ciência, tratativa e elaboração de plano de ação, quando necessário.</p>
    <p style="${p}">Coloco-me à disposição para esclarecimentos.</p>
    <p style="${p}">Atenciosamente,<br>
    <strong>Lucas Lemos</strong><br>
    Enfermeiro SCIH<br>
    Serviço de Controle de Infecção Hospitalar</p>
  </div>
</body></html>`;
}

interface ReportMetrics {
  generalComplianceRate: number;
  totalAudits: number;
  compliantItems: number;
  nonCompliantItems: number;
}

function buildReportEmailHtml(
  managerName: string,
  hospitalName: string,
  sectorName: string,
  auditTypeName: string,
  period: string,
  metrics: ReportMetrics,
  logoHeaderHtml = "",
): string {
  const p = "margin:0 0 12px;font-size:14px;line-height:1.6;color:#1f2937;";
  const complianceColor = metrics.generalComplianceRate >= 80 ? "#16a34a" : metrics.generalComplianceRate >= 60 ? "#d97706" : "#dc2626";

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:680px;margin:0 auto;">
    ${logoHeaderHtml}
    <h2 style="margin:20px 0 4px;font-size:18px;color:#111827;">Relatório Gerencial de Auditoria</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">${escapeHtml(hospitalName)} — ${escapeHtml(sectorName)}</p>

    <p style="${p}">Prezado(a) ${escapeHtml(managerName || "Gestor(a) do Setor")},</p>
    <p style="${p}">Encaminhamos em anexo o Relatório Gerencial de Auditorias referente ao período <strong>${escapeHtml(period)}</strong>, elaborado pelo Serviço de Controle de Infecção Hospitalar (SCIH).</p>
    <p style="${p}">O relatório contempla os resultados das auditorias realizadas no setor <strong>${escapeHtml(sectorName)}</strong>, com análise de conformidade, identificação de não conformidades, análise de causas prováveis, recomendações e metas para o próximo ciclo.</p>

    <table style="border-collapse:collapse;width:100%;margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th colspan="2" style="padding:10px 14px;font-size:13px;text-align:left;color:#374151;border-bottom:1px solid #e5e7eb;">
            Resumo — ${escapeHtml(auditTypeName)}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;width:60%;">Taxa de Conformidade Geral</td>
          <td style="padding:8px 14px;font-size:14px;font-weight:700;color:${complianceColor};border-bottom:1px solid #f3f4f6;">${metrics.generalComplianceRate.toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="padding:8px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">Total de Auditorias</td>
          <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${metrics.totalAudits}</td>
        </tr>
        <tr>
          <td style="padding:8px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">Itens Conformes</td>
          <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#16a34a;border-bottom:1px solid #f3f4f6;">${metrics.compliantItems}</td>
        </tr>
        <tr>
          <td style="padding:8px 14px;font-size:13px;color:#374151;">Itens Não Conformes</td>
          <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#dc2626;">${metrics.nonCompliantItems}</td>
        </tr>
      </tbody>
    </table>

    <p style="${p}">O documento completo com gráficos está disponível no arquivo PDF em anexo. O conteúdo do relatório em formato texto (.md) também acompanha este e-mail para facilitar registros e arquivamento.</p>
    <p style="${p}">Solicitamos que, após a leitura, sejam adotadas as medidas recomendadas e, quando necessário, elaborado o plano de ação para tratativa das não conformidades identificadas.</p>
    <p style="${p}">Permanecemos à disposição para esclarecimentos e apoio na implementação das melhorias.</p>
    <p style="${p}">Atenciosamente,<br>
    <strong>Lucas Lemos</strong><br>
    Enfermeiro SCIH<br>
    Serviço de Controle de Infecção Hospitalar</p>
  </div>
</body></html>`;
}

async function fetchLogoAttachments(
  userId: string,
): Promise<{ attachments: { filename: string; content: string; content_id: string }[]; logoHeaderHtml: string }> {
  const attachments: { filename: string; content: string; content_id: string }[] = [];
  let logoHeaderHtml = "";

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: hu } = await adminClient
      .from("hospital_users").select("hospital_id").eq("user_id", userId).limit(1).maybeSingle();
    const hid = hu?.hospital_id;

    if (hid) {
      const { data: logoRecords } = await adminClient
        .from("hospital_logos")
        .select("logo_type, storage_path, display_order")
        .eq("hospital_id", hid)
        .order("display_order");

      if (logoRecords?.length) {
        const bucketBase = `${supabaseUrl}/storage/v1/object/public/hospital-logos/`;
        const MAX_LOGO_BYTES = 512 * 1024;

        const hospitalLogoRec = logoRecords.find((r: any) => r.logo_type === "hospital");
        const scihLogoRecs = logoRecords.filter((r: any) => r.logo_type === "scih").slice(0, 3);

        let hospitalLogoBase64: string | undefined;
        const scihLogosBase64: string[] = [];

        if (hospitalLogoRec) {
          try {
            const res = await fetch(bucketBase + hospitalLogoRec.storage_path, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const bytes = new Uint8Array(await res.arrayBuffer());
              if (bytes.length <= MAX_LOGO_BYTES) {
                const ext = hospitalLogoRec.storage_path.split(".").pop() || "png";
                hospitalLogoBase64 = encodeBase64(bytes);
                attachments.push({ filename: `hospital-logo.${ext}`, content: hospitalLogoBase64, content_id: "hospital-logo" });
              }
            }
          } catch { /* skip logo on error */ }
        }

        for (let i = 0; i < scihLogoRecs.length; i++) {
          try {
            const rec = scihLogoRecs[i];
            const res = await fetch(bucketBase + rec.storage_path, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const bytes = new Uint8Array(await res.arrayBuffer());
              if (bytes.length <= MAX_LOGO_BYTES) {
                const ext = rec.storage_path.split(".").pop() || "png";
                const b64 = encodeBase64(bytes);
                scihLogosBase64.push(b64);
                attachments.push({ filename: `scih-logo-${i}.${ext}`, content: b64, content_id: `scih-logo-${i}` });
              }
            }
          } catch { /* skip */ }
        }

        logoHeaderHtml = buildLogoHeaderHtml(hospitalLogoBase64, scihLogosBase64);
      }
    }
  } catch { /* logos are optional */ }

  return { attachments, logoHeaderHtml };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada no Supabase." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const from = Deno.env.get("AUDIT_EMAIL_FROM") || "IRASControl <onboarding@resend.dev>";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const body = await req.json();
    const { reportMode } = body;

    // ── MODO RELATÓRIO GERENCIAL ──────────────────────────────────────────────
    if (reportMode) {
      const {
        to, cc, managerName,
        reportPdfBase64, markdownContent,
        hospitalName, sectorName, auditTypeName, period, metrics,
      } = body as {
        to?: string; cc?: string[]; managerName?: string;
        reportPdfBase64?: string; markdownContent?: string;
        hospitalName?: string; sectorName?: string; auditTypeName?: string;
        period?: string; metrics?: ReportMetrics;
      };

      if (!to || !emailRegex.test(to)) {
        return new Response(JSON.stringify({ error: "E-mail do destinatário inválido." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!reportPdfBase64 || !markdownContent) {
        return new Response(JSON.stringify({ error: "PDF ou conteúdo do relatório ausente." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ccList = Array.isArray(cc)
        ? [...new Set(cc.filter((e) => typeof e === "string" && emailRegex.test(e.trim()) && e.trim() !== to).map((e) => e.trim()))]
        : [];

      const { attachments, logoHeaderHtml } = await fetchLogoAttachments(user.id);

      // PDF attachment
      const dateStr = new Date().toISOString().slice(0, 10);
      attachments.push({
        filename: `relatorio-auditoria-${dateStr}.pdf`,
        content: reportPdfBase64,
        content_id: "report-pdf",
      });

      // Markdown attachment (base64-encoded UTF-8)
      const mdBytes = new TextEncoder().encode(markdownContent);
      const mdBase64 = encodeBase64(mdBytes);
      attachments.push({
        filename: `relatorio-auditoria-${dateStr}.md`,
        content: mdBase64,
        content_id: "report-md",
      });

      const safeMetrics: ReportMetrics = metrics ?? {
        generalComplianceRate: 0, totalAudits: 0, compliantItems: 0, nonCompliantItems: 0,
      };

      const subject = `Relatório Gerencial de Auditoria — ${auditTypeName || "Auditoria"} — ${sectorName || ""} (${period || dateStr})`;
      const html = buildReportEmailHtml(
        managerName || "",
        hospitalName || "",
        sectorName || "",
        auditTypeName || "Auditoria",
        period || dateStr,
        safeMetrics,
        logoHeaderHtml,
      );

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to: [to], subject, html,
          ...(ccList.length > 0 ? { cc: ccList } : {}),
          attachments,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: result?.message || "Falha ao enviar e-mail.", details: result }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, id: result?.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MODO AUDITORIA INDIVIDUAL ─────────────────────────────────────────────
    const { to, cc, managerName, audit, photoPaths, photoCaptions } = body as {
      to?: string; cc?: string[]; managerName?: string; audit?: AuditPayload;
      photoPaths?: string[]; photoCaptions?: string[];
    };

    if (!to || typeof to !== "string" || !emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: "E-mail do destinatário inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!audit || typeof audit !== "object") {
      return new Response(JSON.stringify({ error: "Dados da auditoria ausentes." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ccList = Array.isArray(cc)
      ? [...new Set(cc.filter((e) => typeof e === "string" && emailRegex.test(e.trim()) && e.trim() !== to).map((e) => e.trim()))]
      : [];

    const { attachments, logoHeaderHtml } = await fetchLogoAttachments(user.id);

    // Baixar fotos do Storage e preparar como anexos inline (cid)
    let photosHtml = "";
    if (Array.isArray(photoPaths) && photoPaths.length > 0) {
      const MAX_PHOTOS = 12;
      const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
      let totalBytes = 0;
      const cells: string[] = [];
      for (let i = 0; i < photoPaths.length && attachments.filter(a => a.content_id.startsWith("audit-photo")).length < MAX_PHOTOS; i++) {
        const path = photoPaths[i];
        if (typeof path !== "string") continue;
        const { data: blob, error: dlErr } = await callerClient.storage
          .from("audit-photos").download(path);
        if (dlErr || !blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (totalBytes + bytes.length > MAX_TOTAL_BYTES) break;
        totalBytes += bytes.length;
        const ext = (path.split(".").pop() || "jpg").toLowerCase();
        const cid = `audit-photo-${i}`;
        const caption = (Array.isArray(photoCaptions) ? photoCaptions[i] : "")?.trim();
        const label = caption ? `Foto ${i + 1} — ${escapeHtml(caption)}` : `Foto ${i + 1}`;
        attachments.push({ filename: `foto-${i + 1}.${ext}`, content: encodeBase64(bytes), content_id: cid });
        cells.push(`<td width="50%" style="padding:6px;text-align:center;vertical-align:top;">
          <img src="cid:${cid}" alt="${label}" style="width:100%;max-width:300px;height:auto;border:1px solid #e5e7eb;border-radius:8px;" />
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">${label}</div>
        </td>`);
      }
      if (cells.length > 0) {
        let rows = "";
        for (let r = 0; r < cells.length; r += 2) {
          rows += `<tr>${cells[r]}${cells[r + 1] || '<td width="50%"></td>'}</tr>`;
        }
        photosHtml = `<div style="margin:20px 0;">
          <h4 style="margin:0 0 10px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">Fotos da auditoria (${cells.length})</h4>
          <table role="presentation" width="100%" style="border-collapse:collapse;"><tbody>${rows}</tbody></table>
        </div>`;
      }
    }

    const subject = `Auditoria SCIH — ${audit.typeLabel}${audit.sector ? ` — ${audit.sector}` : ""} (${formatDate(audit.date)})`;
    const html = buildEmailHtml(managerName || "", audit, photosHtml, logoHeaderHtml);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from, to: [to], subject, html,
        ...(ccList.length > 0 ? { cc: ccList } : {}),
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: result?.message || "Falha ao enviar e-mail.", details: result }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result?.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Erro inesperado." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
