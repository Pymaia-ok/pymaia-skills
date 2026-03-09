import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SecurityReportButtonProps {
  itemType: "skill" | "connector" | "plugin";
  itemId: string;
  itemSlug: string;
}

const REPORT_TYPES = [
  { value: "data_exfiltration", label: "Data Exfiltration", labelEs: "Exfiltración de datos" },
  { value: "malicious_behavior", label: "Malicious Behavior", labelEs: "Comportamiento malicioso" },
  { value: "excessive_permissions", label: "Excessive Permissions", labelEs: "Permisos excesivos" },
  { value: "prompt_injection", label: "Prompt Injection", labelEs: "Inyección de prompt" },
  { value: "other", label: "Other", labelEs: "Otro" },
];

const SecurityReportButton = ({ itemType, itemId, itemSlug }: SecurityReportButtonProps) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType || !description.trim()) {
      toast.error(isEs ? "Completa todos los campos requeridos" : "Fill in all required fields");
      return;
    }

    if (description.trim().length < 20) {
      toast.error(isEs ? "La descripción debe tener al menos 20 caracteres" : "Description must be at least 20 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("security_reports" as any).insert({
        item_type: itemType,
        item_id: itemId,
        item_slug: itemSlug,
        report_type: reportType,
        description: description.trim().slice(0, 2000),
        reporter_email: user?.email || email || null,
        reporter_user_id: user?.id || null,
      } as any);

      if (error) throw error;

      toast.success(isEs ? "Reporte enviado. Revisaremos en menos de 24 horas." : "Report submitted. We'll review within 24 hours.");
      setOpen(false);
      setReportType("");
      setDescription("");
      setEmail("");
    } catch (e) {
      console.error("Report error:", e);
      toast.error(isEs ? "Error al enviar el reporte" : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5">
          <ShieldAlert size={14} />
          {isEs ? "Reportar problema de seguridad" : "Report Security Issue"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-destructive" />
            {isEs ? "Reportar problema de seguridad" : "Report Security Issue"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{isEs ? "Tipo de problema" : "Issue Type"} *</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder={isEs ? "Selecciona el tipo..." : "Select type..."} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(rt => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {isEs ? rt.labelEs : rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isEs ? "Descripción" : "Description"} *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isEs
                ? "Describe el problema de seguridad con el mayor detalle posible..."
                : "Describe the security issue in as much detail as possible..."}
              className="min-h-[100px]"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{description.length}/2000</p>
          </div>

          {!user && (
            <div className="space-y-2">
              <Label>{isEs ? "Tu email (opcional)" : "Your email (optional)"}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            {isEs
              ? "Los reportes son revisados por nuestro equipo. Reportes de exfiltración de datos son procesados en menos de 4 horas."
              : "Reports are reviewed by our team. Data exfiltration reports are processed within 4 hours."}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !reportType || description.trim().length < 20}
            className="w-full"
          >
            {submitting
              ? (isEs ? "Enviando..." : "Submitting...")
              : (isEs ? "Enviar reporte" : "Submit Report")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityReportButton;
