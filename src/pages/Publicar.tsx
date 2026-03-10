import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { submitSkill } from "@/lib/api";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

const roleOptions = ["marketer", "abogado", "consultor", "founder", "disenador", "otro"];
const industryOptions = ["Agencias", "Legal", "Consultoras", "E-commerce", "Startups", "Educación", "Finanzas"];

const Publicar = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [form, setForm] = useState({
    displayName: "", tagline: "", descriptionHuman: "",
    useCase1Title: "", useCase1Before: "", useCase1After: "",
    useCase2Title: "", useCase2Before: "", useCase2After: "",
    useCase3Title: "", useCase3Before: "", useCase3After: "",
    targetRoles: [] as string[], installCommand: "", githubUrl: "",
    timeToInstall: 2, industry: [] as string[],
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const toggleRole = (id: string) => setForm(f => ({ ...f, targetRoles: f.targetRoles.includes(id) ? f.targetRoles.filter(r => r !== id) : [...f.targetRoles, id] }));
  const toggleIndustry = (id: string) => setForm(f => ({ ...f, industry: f.industry.includes(id) ? f.industry.filter(i => i !== id) : [...f.industry, id] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName || !form.tagline || !form.descriptionHuman || !form.installCommand) { toast.error(t("publish.fillRequired")); return; }
    if (form.targetRoles.length === 0) { toast.error(t("publish.selectRole")); return; }

    // ── Security Gate: scan before publishing ──
    setScanning(true);
    setScanResult(null);
    try {
      const contentToScan = [form.displayName, form.tagline, form.descriptionHuman, form.installCommand].join("\n\n");
      const slug = form.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      const { data: scanData, error: scanError } = await supabase.functions.invoke("scan-security", {
        body: {
          gate_mode: true,
          content: contentToScan,
          install_command: form.installCommand,
          slug,
          item_type: "skill",
        },
      });

      if (scanError) {
        console.error("Security scan error:", scanError);
        // Allow publish if scan fails (don't block on infra issues)
      } else if (scanData && !scanData.pass) {
        setScanResult(scanData);
        setScanning(false);
        toast.error(t("publish.securityBlocked", "Security issues detected — please review"));
        return;
      } else if (scanData) {
        setScanResult(scanData);
      }
    } catch (err) {
      console.error("Security gate error:", err);
    }
    setScanning(false);

    // ── Publish ──
    setSubmitting(true);
    try {
      const slug = form.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const useCases = [
        { title: form.useCase1Title, before: form.useCase1Before, after: form.useCase1After },
        { title: form.useCase2Title, before: form.useCase2Before, after: form.useCase2After },
        { title: form.useCase3Title, before: form.useCase3Before, after: form.useCase3After },
      ].filter(uc => uc.title);
      await submitSkill({ slug, display_name: form.displayName, tagline: form.tagline, description_human: form.descriptionHuman, use_cases: useCases, target_roles: form.targetRoles, install_command: form.installCommand, github_url: form.githubUrl || undefined, time_to_install_minutes: form.timeToInstall, industry: form.industry, creator_id: user.id });
      toast.success(t("publish.success"));
      navigate("/explorar");
    } catch { toast.error(t("publish.error")); }
    setSubmitting(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 max-w-2xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="section-title mb-2">{t("publish.title")}</h1>
          <p className="text-muted-foreground mb-10">{t("publish.subtitle")}</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">{t("publish.nameLabel")}</label>
              <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder={t("publish.namePlaceholder")} className={inputClass} maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("publish.taglineLabel")}</label>
              <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder={t("publish.taglinePlaceholder")} className={inputClass} maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("publish.descLabel")}</label>
              <textarea value={form.descriptionHuman} onChange={e => setForm(f => ({ ...f, descriptionHuman: e.target.value }))} rows={4} placeholder={t("publish.descPlaceholder")} className={inputClass + " resize-none"} maxLength={1000} />
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block">{t("publish.useCasesLabel")}</label>
              {[1, 2, 3].map(n => {
                const titleKey = `useCase${n}Title` as keyof typeof form;
                const beforeKey = `useCase${n}Before` as keyof typeof form;
                const afterKey = `useCase${n}After` as keyof typeof form;
                return (
                  <div key={n} className="p-4 rounded-xl bg-secondary mb-3">
                    <p className="text-xs text-muted-foreground mb-2">{(t("publish.useCaseN") as string).replace("{{n}}", String(n))}</p>
                    <input value={form[titleKey] as string} onChange={e => setForm(f => ({ ...f, [titleKey]: e.target.value }))} placeholder={t("publish.useCaseTitle")} className="w-full px-3 py-2 rounded-lg bg-background text-sm mb-2 focus:outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={form[beforeKey] as string} onChange={e => setForm(f => ({ ...f, [beforeKey]: e.target.value }))} placeholder={t("publish.useCaseBefore")} className="px-3 py-2 rounded-lg bg-background text-sm focus:outline-none" />
                      <input value={form[afterKey] as string} onChange={e => setForm(f => ({ ...f, [afterKey]: e.target.value }))} placeholder={t("publish.useCaseAfter")} className="px-3 py-2 rounded-lg bg-background text-sm focus:outline-none" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block">{t("publish.targetLabel")}</label>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map(r => (
                  <button key={r} type="button" onClick={() => toggleRole(r)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${form.targetRoles.includes(r) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                    {t(`roles.${r}.label`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block">{t("publish.industryLabel")}</label>
              <div className="flex flex-wrap gap-2">
                {industryOptions.map(i => (
                  <button key={i} type="button" onClick={() => toggleIndustry(i)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${form.industry.includes(i) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>{i}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("publish.installLabel")}</label>
              <input value={form.installCommand} onChange={e => setForm(f => ({ ...f, installCommand: e.target.value }))} placeholder={t("publish.installPlaceholder")} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("publish.githubLabel")}</label>
              <input value={form.githubUrl} onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))} placeholder={t("publish.githubPlaceholder")} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("publish.timeLabel")}</label>
              <input type="number" min={1} max={30} value={form.timeToInstall} onChange={e => setForm(f => ({ ...f, timeToInstall: Number(e.target.value) }))} className={inputClass + " w-24"} />
            </div>

            {/* Security Gate Results */}
            {scanResult && !scanResult.pass && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-destructive text-sm">
                    {t("publish.securityIssues", "Security issues detected")}
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {scanResult.layers?.secrets?.count > 0 && (
                    <li>• {t("publish.secretsFound", "Exposed credentials detected in content")}</li>
                  )}
                  {scanResult.layers?.injection?.critical > 0 && (
                    <li>• {t("publish.injectionFound", "Prompt injection patterns detected")}</li>
                  )}
                  {scanResult.layers?.hidden_content?.findings?.length > 0 && (
                    <li>• {t("publish.hiddenFound", "Hidden or obfuscated content detected")}</li>
                  )}
                  {scanResult.layers?.format?.issues?.filter((i: any) => i.severity === "error")?.length > 0 && (
                    <li>• {t("publish.formatErrors", "Install command format issues detected")}</li>
                  )}
                  {scanResult.layers?.scope?.scope_assessment === "excessive" && (
                    <li>• {t("publish.excessiveScope", "Excessive permissions detected")}</li>
                  )}
                  {scanResult.layers?.llm?.verdict === "MALICIOUS" && (
                    <li>• {t("publish.llmMalicious", "AI analysis flagged potential security risk")}</li>
                  )}
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  {t("publish.fixAndRetry", "Please fix the issues above and try again.")}
                </p>
              </div>
            )}

            {scanResult?.pass && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  {t("publish.securityPassed", "Security scan passed")}
                </span>
              </div>
            )}

            <button type="submit" disabled={submitting || scanning} className="w-full py-3.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("publish.scanning", "Scanning for security issues...")}
                </>
              ) : submitting ? t("publish.submitting") : t("publish.submit")}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Publicar;
