import { motion } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, Copy, Check, Terminal, ShieldCheck, ShieldAlert, ShieldQuestion, Activity, Star, Download, BadgeCheck, Users, Github } from "lucide-react";
import { useState, useCallback } from "react";
import SkillCard from "@/components/SkillCard";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const CATEGORY_COLORS: Record<string, string> = {
  communication: "bg-blue-500",
  development: "bg-emerald-500",
  databases: "bg-amber-500",
  productivity: "bg-violet-500",
  search: "bg-cyan-500",
  automation: "bg-orange-500",
  apis: "bg-pink-500",
  cloud: "bg-sky-500",
  ai: "bg-purple-500",
  design: "bg-rose-500",
  storage: "bg-teal-500",
  general: "bg-gray-500",
};

const ConectorDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const isEs = i18n.language === "es";

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/conectores");
    }
  }, [navigate]);

  const { data: connector, isLoading } = useQuery({
    queryKey: ["connector", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcp_servers")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Find skills that reference this connector in their required_mcps
  const { data: compatibleSkills = [] } = useQuery({
    queryKey: ["compatible-skills", connector?.name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("status", "approved")
        .not("required_mcps", "is", null)
        .limit(12);
      if (error) throw error;
      // Filter client-side for skills that mention this connector
      return data.filter((skill) => {
        const mcps = skill.required_mcps as any[];
        if (!Array.isArray(mcps)) return false;
        return mcps.some(
          (m) =>
            m.name?.toLowerCase().includes(connector!.name.toLowerCase()) ||
            m.server?.toLowerCase().includes(connector!.slug.toLowerCase())
        );
      });
    },
    enabled: !!connector,
  });

  useSEO({
    title: connector ? `${connector.name} — Conectores` : "Conector",
    description: connector?.description || "",
  });

  const handleCopy = () => {
    if (connector?.install_command) {
      navigator.clipboard.writeText(connector.install_command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  if (!connector) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-14 max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-muted-foreground text-lg">Connector not found</p>
          <Link to="/conectores" className="text-primary hover:underline mt-4 inline-block">
            {t("connectors.backToConnectors")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("connectors.backToConnectors")}
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-4 mb-6">
              {connector.icon_url ? (
                <img src={connector.icon_url} alt={connector.name} className="w-14 h-14 rounded-xl" />
              ) : (
                <div className={`w-14 h-14 rounded-xl ${CATEGORY_COLORS[connector.category] || "bg-gray-500"} flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-white">{connector.name[0]?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{connector.name}</h1>
                  {connector.security_status === "verified" && (
                    <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground capitalize">
                  {t(`connectors.${connector.category}`, connector.category)}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground mb-4 text-lg">
              {isEs && connector.description_es ? connector.description_es : connector.description}
            </p>

            {/* Source & Trust info */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {/* Official vs Community badge */}
              {connector.is_official ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {isEs ? "Oficial" : "Official"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  {isEs ? "Comunitario" : "Community"}
                </span>
              )}

              {/* Security status badge */}
              {connector.security_status === "verified" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isEs ? "Seguridad verificada" : "Security verified"}
                </span>
              ) : connector.security_status === "flagged" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {isEs ? "Requiere atención" : "Needs attention"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold">
                  <ShieldQuestion className="w-3.5 h-3.5" />
                  {isEs ? "Sin verificar" : "Unverified"}
                </span>
              )}

              {/* Activity badge */}
              {connector.last_commit_at && (() => {
                const months = (Date.now() - new Date(connector.last_commit_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
                return months <= 6 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <Activity className="w-3.5 h-3.5" />
                    {isEs ? "Activo" : "Active"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold">
                    <Activity className="w-3.5 h-3.5" />
                    {isEs ? "Inactivo" : "Inactive"}
                  </span>
                );
              })()}
            </div>

            {/* Stats row */}
            {((connector.github_stars ?? 0) > 0 || (connector.external_use_count ?? 0) > 0 || connector.github_url) && (
              <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-muted-foreground">
                {(connector.github_stars ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4" />
                    {connector.github_stars?.toLocaleString()} stars
                  </span>
                )}
                {(connector.external_use_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Download className="w-4 h-4" />
                    {connector.external_use_count?.toLocaleString()} downloads
                  </span>
                )}
                {connector.github_url && (
                  <a
                    href={connector.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    {isEs ? "Ver código fuente" : "View source"}
                  </a>
                )}
              </div>
            )}

            {/* Install command */}
            {connector.install_command ? (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  {t("connectors.installCommand")}
                </h2>
                <div
                  onClick={handleCopy}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary cursor-pointer hover:bg-accent transition-colors group"
                >
                  <code className="text-sm text-foreground font-mono">{connector.install_command}</code>
                  {copied ? (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-8 p-5 rounded-2xl border border-dashed border-border bg-secondary/30">
                <p className="text-sm text-muted-foreground mb-3">
                  {t("connectors.noMcpYet", "No hay servidor MCP disponible aún para esta herramienta.")}
                </p>
                {connector.homepage && (
                  <a
                    href={connector.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                  >
                    {t("connectors.visitWebsite", "Visitar sitio oficial")}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Credentials */}
            {connector.credentials_needed && connector.credentials_needed.length > 0 ? (
              <>
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-foreground mb-3">
                    {t("connectors.credentials")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {connector.credentials_needed.map((cred: string) => (
                      <span key={cred} className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-mono text-foreground">
                        {cred}
                      </span>
                    ))}
                  </div>
                </div>

                {/* How to setup */}
                <div className="mb-8 p-6 rounded-2xl bg-secondary/50 border border-border">
                  <h2 className="font-semibold text-foreground mb-4">{t("connectors.howToSetup")}</h2>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">1</span>
                      {t("connectors.setupStep1")}
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">2</span>
                      {t("connectors.setupStep2")}
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">3</span>
                      {t("connectors.setupStep3")}
                    </li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <Check className="w-4 h-4" />
                {t("connectors.noApiKey")}
              </div>
            )}

            {/* Docs link */}
            {connector.docs_url && (
              <a
                href={connector.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8"
              >
                {t("connectors.docs")}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Compatible skills */}
            {compatibleSkills.length > 0 && (
              <div className="mt-12">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {t("connectors.compatibleSkills")}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {compatibleSkills.map((skill, i) => (
                    <SkillCard key={skill.id} skill={skill} index={i} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ConectorDetail;
