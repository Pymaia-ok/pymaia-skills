import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { ShieldAlert, ShieldCheck, AlertTriangle, Calendar, ExternalLink } from "lucide-react";

const severityConfig: Record<string, { color: string; icon: any; label: string }> = {
  P0: { color: "text-destructive", icon: ShieldAlert, label: "Critical" },
  P1: { color: "text-destructive", icon: ShieldAlert, label: "High" },
  P2: { color: "text-amber-500", icon: AlertTriangle, label: "Medium" },
  P3: { color: "text-muted-foreground", icon: ShieldCheck, label: "Low" },
};

const SecurityAdvisories = () => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const { data: advisories, isLoading } = useQuery({
    queryKey: ["security-advisories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_advisories")
        .select("*")
        .eq("is_public", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14 max-w-3xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">
              {isEs ? "Avisos de Seguridad" : "Security Advisories"}
            </h1>
          </div>
          <p className="text-muted-foreground mb-10">
            {isEs
              ? "Transparencia total: publicamos todos los incidentes de seguridad detectados y las acciones tomadas."
              : "Full transparency: we publish all detected security incidents and actions taken."}
          </p>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-2xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : !advisories || advisories.length === 0 ? (
            <div className="text-center py-20">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {isEs ? "Sin incidentes" : "No incidents"}
              </h2>
              <p className="text-muted-foreground">
                {isEs
                  ? "No hay avisos de seguridad publicados. Nuestro pipeline de validación mantiene el catálogo seguro."
                  : "No security advisories published. Our validation pipeline keeps the catalog safe."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {advisories.map((adv: any) => {
                const sev = severityConfig[adv.severity] || severityConfig.P3;
                const SevIcon = sev.icon;
                return (
                  <motion.div
                    key={adv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-secondary border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <SevIcon className={`w-5 h-5 mt-0.5 shrink-0 ${sev.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sev.color}`}>
                            {sev.label}
                          </span>
                          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-background">
                            {adv.item_type}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1">{adv.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{adv.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(adv.published_at).toLocaleDateString(isEs ? "es-AR" : "en-US", {
                              year: "numeric", month: "short", day: "numeric"
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {adv.item_slug}
                          </span>
                        </div>
                        {adv.action_taken && (
                          <div className="mt-3 p-3 rounded-xl bg-background text-sm">
                            <span className="font-medium">{isEs ? "Acción tomada:" : "Action taken:"}</span>{" "}
                            {adv.action_taken}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SecurityAdvisories;
