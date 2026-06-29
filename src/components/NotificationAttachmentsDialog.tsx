import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Paperclip, Upload, Eye, Printer, Trash2, Download,
  Loader2, FileText, Image, FileCheck, File, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACCEPTED_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

interface Attachment {
  id: string;
  notification_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  uploaded_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  notificationId: string;
  notificationLabel: string;
  hospitalId: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string | null }) {
  if (type === "application/pdf") return <FileText className="h-4 w-4 text-primary" />;
  if (type?.startsWith("image/")) return <Image className="h-4 w-4 text-primary" />;
  return <File className="h-4 w-4 text-primary" />;
}

export default function NotificationAttachmentsDialog({
  open, onClose, notificationId, notificationLabel, hospitalId,
}: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && notificationId) {
      loadAttachments();
      setSelected(new Set());
    }
  }, [open, notificationId]);

  async function loadAttachments() {
    setLoading(true);
    const { data, error } = await (supabase
      .from("notification_attachments" as any)
      .select("*")
      .eq("notification_id", notificationId)
      .order("uploaded_at", { ascending: false }) as any);
    if (error) toast.error("Erro ao carregar anexos: " + error.message);
    else setAttachments((data || []) as Attachment[]);
    setLoading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 52 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 50 MB.");
      return;
    }
    setPendingFile(file);
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${hospitalId}/${notificationId}/${Date.now()}_${safeName}`;

      const { error: storageErr } = await supabase.storage
        .from("notification-attachments")
        .upload(filePath, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (storageErr) throw storageErr;

      const { error: dbErr } = await (supabase.from("notification_attachments" as any).insert({
        notification_id: notificationId,
        hospital_id: hospitalId,
        file_name: pendingFile.name,
        file_path: filePath,
        file_size: pendingFile.size,
        file_type: pendingFile.type,
        description: description.trim() || null,
      }) as any);

      if (dbErr) {
        await supabase.storage.from("notification-attachments").remove([filePath]);
        throw dbErr;
      }

      toast.success("Arquivo anexado!");
      setPendingFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAttachments();
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function getSignedUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from("notification-attachments")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  async function handleView(att: Attachment) {
    const url = await getSignedUrl(att.file_path);
    if (!url) { toast.error("Erro ao abrir arquivo."); return; }
    window.open(url, "_blank");
  }

  async function handlePrint(att: Attachment) {
    const url = await getSignedUrl(att.file_path);
    if (!url) { toast.error("Erro ao preparar impressão."); return; }
    const win = window.open(url, "_blank");
    if (win) win.addEventListener("load", () => { try { win.print(); } catch { /* user can print manually */ } });
  }

  async function handleDownload(att: Attachment) {
    const url = await getSignedUrl(att.file_path);
    if (!url) { toast.error("Erro ao baixar arquivo."); return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = att.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleDelete(att: Attachment) {
    if (!confirm(`Excluir "${att.file_name}"?`)) return;
    const { error: sErr } = await supabase.storage
      .from("notification-attachments")
      .remove([att.file_path]);
    if (sErr) { toast.error("Erro ao excluir: " + sErr.message); return; }
    const { error: dErr } = await (supabase.from("notification_attachments" as any)
      .delete().eq("id", att.id) as any);
    if (dErr) { toast.error("Erro ao excluir registro: " + dErr.message); return; }
    toast.success("Arquivo excluído.");
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    setSelected(prev => { const n = new Set(prev); n.delete(att.id); return n; });
  }

  async function handlePrintSelected() {
    if (selected.size === 0) return;
    setPrinting(true);
    try {
      const targets = attachments.filter(a => selected.has(a.id));
      toast.info(`Abrindo ${targets.length} arquivo(s) para impressão…`);
      for (const att of targets) {
        const url = await getSignedUrl(att.file_path);
        if (url) window.open(url, "_blank");
      }
    } finally {
      setPrinting(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === attachments.length) setSelected(new Set());
    else setSelected(new Set(attachments.map(a => a.id)));
  }

  function handleClose() {
    setPendingFile(null);
    setDescription("");
    setSelected(new Set());
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-blue-600" />
            Anexos — {notificationLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Upload */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <p className="text-sm font-medium">Anexar arquivo enviado à ANVISA</p>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="hidden"
              id="notif-attach-input"
            />
            <label
              htmlFor="notif-attach-input"
              className="flex items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {pendingFile ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium truncate max-w-xs">{pendingFile.name}</span>
                  <span className="text-muted-foreground shrink-0">({formatBytes(pendingFile.size)})</span>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <Upload className="h-5 w-5 mx-auto mb-1" />
                  Clique para selecionar um arquivo
                  <p className="text-xs mt-0.5">PDF, imagem ou Word — máx. 50 MB</p>
                </div>
              )}
            </label>

            <div className="space-y-1">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                placeholder="Ex: Notificação enviada via SINAN em 29/06/2026"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <Button onClick={handleUpload} disabled={!pendingFile || uploading} className="w-full gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Salvar Anexo"}
            </Button>
          </div>

          {/* Saved attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                Arquivos salvos
                {attachments.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{attachments.length}</Badge>
                )}
              </p>

              {/* Multi-select controls */}
              {attachments.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAll}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    {selected.size === attachments.length ? "Desmarcar todos" : "Selecionar todos"}
                  </button>
                  {selected.size > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintSelected}
                      disabled={printing}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {printing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                      Imprimir selecionados ({selected.size})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />Carregando…
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum arquivo anexado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${selected.has(att.id) ? "border-primary/50 bg-primary/5" : "hover:bg-muted/40"}`}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={selected.has(att.id)}
                      onCheckedChange={() => toggleSelect(att.id)}
                      className="mt-0.5 shrink-0"
                    />

                    {/* File icon */}
                    <div className="p-1.5 rounded bg-primary/10 shrink-0 mt-0.5">
                      <FileIcon type={att.file_type} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.file_name}</p>
                      {att.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{att.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(att.file_size)} · {format(new Date(att.uploaded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Action icons */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" title="Visualizar" className="h-8 w-8" onClick={() => handleView(att)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Imprimir" className="h-8 w-8" onClick={() => handlePrint(att)}>
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Baixar" className="h-8 w-8" onClick={() => handleDownload(att)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Excluir" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(att)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 border-t mt-2">
          <Button variant="outline" onClick={handleClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
