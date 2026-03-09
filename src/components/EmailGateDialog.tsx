import { useState, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

interface EmailGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillId: string;
  skillName: string;
  skillSlug: string;
  onEmailCaptured: (email: string) => void;
}

const EmailGateDialog = forwardRef<HTMLDivElement, EmailGateDialogProps>(({ open, onOpenChange, skillId, skillName, skillSlug, onEmailCaptured }, ref) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Save lead
      await supabase.from("leads" as any).upsert(
        { email, source: "skill_install", skill_id: skillId } as any,
        { onConflict: "email" }
      );

      // Enroll in post_install sequence
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/enroll-sequence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            sequence_name: "post_install",
            metadata: { skill_name: skillName, skill_slug: skillSlug },
          }),
        }
      );

      // Also enroll in welcome if first time
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/enroll-sequence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            sequence_name: "welcome",
            metadata: { name: "" },
          }),
        }
      );

      onEmailCaptured(email);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t("emailGate.title", "Ingresá tu email para instalar")}
          </DialogTitle>
          <DialogDescription>
            {t("emailGate.description", "Te enviaremos tips de uso y te avisaremos de novedades. Sin spam.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <label htmlFor="email-gate-input" className="sr-only">{t("emailGate.placeholder", "tu@email.com")}</label>
          <input
            id="email-gate-input"
            type="email"
            required
            placeholder={t("emailGate.placeholder", "tu@email.com")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting
              ? "..."
              : t("emailGate.submit", "Continuar con la instalación")}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            {t("emailGate.privacy", "Tu email está seguro. Podés desuscribirte en cualquier momento.")}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailGateDialog;
