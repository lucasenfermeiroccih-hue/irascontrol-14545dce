import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList } from "lucide-react";
import { AuditManagerReportModal } from "./AuditManagerReportModal";
import type { AuditReportMode } from "./auditReportTypes";

export interface AuditManagerReportButtonProps {
  hospitalId: string;
  hospitalName: string;
  availableSectors: string[];
  defaultAuditType?: string;
}

export function AuditManagerReportButton({
  hospitalId,
  hospitalName,
  availableSectors,
  defaultAuditType,
}: AuditManagerReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuditReportMode>("single_audit_type");

  const openSingle = () => {
    setMode("single_audit_type");
    setOpen(true);
  };

  const openCompiled = () => {
    setMode("monthly_sector_compiled");
    setOpen(true);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openSingle} title="Gerar relatório desta auditoria">
        <FileText className="h-4 w-4 mr-1" />
        Gerar Relatório
      </Button>
      <Button variant="outline" size="sm" onClick={openCompiled} title="Gerar relatório mensal compilado do gestor">
        <ClipboardList className="h-4 w-4 mr-1" />
        Relatório do Gestor
      </Button>
      <AuditManagerReportModal
        open={open}
        onClose={() => setOpen(false)}
        hospitalId={hospitalId}
        hospitalName={hospitalName}
        availableSectors={availableSectors}
        defaultAuditType={defaultAuditType}
        defaultMode={mode}
      />
    </>
  );
}
