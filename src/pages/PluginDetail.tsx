import { motion } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, BadgeCheck, ShieldCheck, ShieldQuestion, Download, Github, AlertTriangle, Copy, Check, Monitor, Users2 } from "lucide-react";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const PluginDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEs = i18n.language === "es";

  const handleBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/plugins");
  }, [navigate]);

  const { data: plugin, isLoading } = useQuery({
    queryKey: ["plugin", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plugins" as any)
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  useSEO({
    title: plugin ? `${plugin.name} — Plugins` : "Plugin",
    description: plugin?.description || "",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-3xl mx-auto px-6 py-16">
          <div className="h-8 w-48 bg-secondary animate-pulse rounded mb-4" />
          <div className="h-4 w-96 bg-secondary animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-muted-foreground text-lg">Plugin not found</p>
          <Link to="/plugins" className="text-primary hover:underline mt-4 inline-block">
            {t("plugins.backToPlugins")}
          </Link>
        </div>
      </div>
    );
  }

  const [copied, setCopied] = useState(false);

  // Extract the plugin identifier from homepage URL (e.g., https://claude.com/plugins/slack → slack)
  const pluginId = plugin?.homepage?.match(/claude\.com\/plugins\/([^/?#]+)/)?.[1] || plugin?.slug?.replace(/-plugin$/, "");

  // Build install URLs
  const coworkUrl = plugin?.is_official
    ? `https://claude.ai/redirect/claudedotcom.v1.0920c6c1-6b38-4271-8d4e-842e466c7ca3/desktop/customize/plugins/new?marketplace=anthropics/knowledge-work-plugins&plugin=${pluginId}`
    : plugin?.github_url || plugin?.homepage || "#";

  const codeCommand = plugin?.is_official
    ? `claude plugin install ${pluginId}@claude-plugins-official`
    : plugin?.github_url
      ? `claude plugin install ${plugin.github_url}`
      : `claude plugin install ${pluginId}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeCommand]);

  const showCowork = plugin?.platform === "cowork" || plugin?.platform === "both";
  const showCode = plugin?.platform === "claude-code" || plugin?.platform === "both";

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <button onClick={handleBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("plugins.backToPlugins")}
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-4 mb-6">
              {plugin.icon_url ? (
                <img src={plugin.icon_url} alt={plugin.name} className="w-14 h-14 rounded-xl" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{plugin.name[0]?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{isEs && plugin.name_es ? plugin.name_es : plugin.name}</h1>
                  {plugin.is_anthropic_verified && <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                </div>
                <span className="text-sm text-muted-foreground">
                  {plugin.platform === "both" ? "Claude Code + Cowork" : plugin.platform === "claude-code" ? "Claude Code" : "Cowork"}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground mb-6 text-lg">
              {isEs && plugin.description_es ? plugin.description_es : plugin.description}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {plugin.is_anthropic_verified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Anthropic Verified
                </span>
              ) : plugin.is_official ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isEs ? "Oficial" : "Official"}
                </span>
              ) : plugin.security_status === "verified" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isEs ? "Verificado" : "Verified"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold">
                  <ShieldQuestion className="w-3.5 h-3.5" />
                  {isEs ? "Comunitario" : "Community"}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold">
                {plugin.platform === "both" ? "Claude Code + Cowork" : plugin.platform === "claude-code" ? "Claude Code" : "Cowork"}
              </span>

              {plugin.install_count > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold">
                  <Download className="w-3.5 h-3.5" />
                  {plugin.install_count.toLocaleString()} installs
                </span>
              )}
            </div>

            {/* Install CTA */}
            <div className="mb-8">
              <a
                href={installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-opacity"
              >
                {isEs ? "Instalar en Claude" : "Install in Claude"}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Security warning for community plugins */}
            {!plugin.is_official && plugin.security_status !== "verified" && (
              <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      {t("plugins.securityWarningTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("plugins.securityWarning")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* GitHub link */}
            {plugin.github_url && (
              <div className="mb-8">
                <a
                  href={plugin.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="w-4 h-4" />
                  {isEs ? "Ver código fuente" : "View source code"}
                </a>
              </div>
            )}

            {/* What are plugins */}
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <h2 className="font-semibold text-foreground mb-3">{t("plugins.whatArePlugins")}</h2>
              <p className="text-sm text-muted-foreground">{t("plugins.whatArePluginsDesc")}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PluginDetail;
