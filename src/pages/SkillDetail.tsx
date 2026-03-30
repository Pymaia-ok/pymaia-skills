import { useParams, Link } from "react-router-dom";
import SkillHero from "@/components/skill-detail/SkillHero";
import SkillSidebar from "@/components/skill-detail/SkillSidebar";
import { motion } from "framer-motion";
import { Star, ArrowLeft, Copy, Check, Clock, Download, ExternalLink, User, Heart, ChevronDown, ChevronUp, BookOpen, Plug, ShieldCheck, Activity, Lock, FileArchive, Package, Loader2, AlertTriangle, Wrench, ListChecks, Zap } from "lucide-react";
import { TrustBadge, ScannedByPymaiaBadge } from "@/components/TrustBadge";
import SecurityPanel from "@/components/SecurityPanel";
import SecurityReportButton from "@/components/SecurityReportButton";
import DetailFAQ from "@/components/DetailFAQ";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import EmailGateDialog from "@/components/EmailGateDialog";
import { fetchSkillBySlug, fetchReviewsForSkill, createReview, parseUseCases, trackInstallation, fetchProfile, submitPlugin } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import ShareButton from "@/components/ShareButton";
import JSZip from "jszip";
import { parseSkillMd } from "@/lib/parseSkillMd";
import MultiAgentInstall from "@/components/MultiAgentInstall";

const SkillDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showFullReadme, setShowFullReadme] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTimeSaved, setReviewTimeSaved] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<"copy" | "zip">("copy");
  const [convertingToPlugin, setConvertingToPlugin] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const shareToken = searchParams.get("token");

  const { data: skill, isLoading } = useQuery({ queryKey: ["skill", slug, shareToken], queryFn: () => fetchSkillBySlug(slug || "", shareToken || undefined), enabled: !!slug });
  const { data: reviews = [], refetch: refetchReviews } = useQuery({ queryKey: ["reviews", skill?.id], queryFn: () => fetchReviewsForSkill(skill!.id), enabled: !!skill?.id });
  const { data: creatorProfile } = useQuery({ queryKey: ["creator", skill?.creator_id], queryFn: () => fetchProfile(skill!.creator_id!), enabled: !!skill?.creator_id });

  const useCases = skill ? parseUseCases(skill.use_cases) : [];
  const displayName = skill ? ((i18n.language === "es" && skill.display_name_es) ? skill.display_name_es : skill.display_name) : "";
  const tagline = skill ? ((i18n.language === "es" && skill.tagline_es) ? skill.tagline_es : skill.tagline) : "";
  const descriptionHuman = skill ? ((i18n.language === "es" && skill.description_human_es) ? skill.description_human_es : skill.description_human) : "";

  // Parse SKILL.md sections
  const parsedMd = skill ? parseSkillMd(skill.install_command) : null;

  useSEO({
    title: skill ? `${displayName} — ${tagline}` : "Loading...",
    description: skill ? `${descriptionHuman.slice(0, 150)}. ${skill.review_count > 0 ? `⭐ ${Number(skill.avg_rating).toFixed(1)} (${skill.review_count} reviews) · ` : ""}${skill.github_stars > 0 ? `★ ${skill.github_stars.toLocaleString()} GitHub stars · ` : ""}${skill.install_count > 0 ? `${skill.install_count} installs.` : ""}` : "",
    canonical: skill ? `https://pymaiaskills.lovable.app/skill/${skill.slug}` : "",
    jsonLd: skill ? {
      "@context": "https://schema.org", "@type": "SoftwareApplication",
      name: skill.display_name, description: descriptionHuman,
      url: `https://pymaiaskills.lovable.app/skill/${skill.slug}`,
      applicationCategory: skill.category, operatingSystem: "Web",
      installUrl: `https://pymaiaskills.lovable.app/skill/${skill.slug}`,
      interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/InstallAction", userInteractionCount: skill.install_count },
      aggregateRating: skill.review_count > 0 ? { "@type": "AggregateRating", ratingValue: Number(skill.avg_rating).toFixed(1), reviewCount: skill.review_count, bestRating: 5, worstRating: 1 } : undefined,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    } : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-6xl mx-auto px-6 py-24">
          <div className="h-8 w-48 bg-secondary rounded animate-pulse mb-4" />
          <div className="h-12 w-96 bg-secondary rounded animate-pulse mb-4" />
          <div className="h-6 w-72 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="section-title mb-4">{t("detail.notFound")}</h1>
          <Link to="/explorar" className="text-muted-foreground hover:text-foreground">← {t("detail.backToDirectory")}</Link>
        </div>
      </div>
    );
  }

  const performCopy = () => {
    navigator.clipboard.writeText(skill.install_command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t("detail.commandCopied", "Comando copiado"));
  };

  const handleCopy = async () => {
    if (user) {
      performCopy();
      trackInstallation(skill.id, user.id).catch(e => console.error("[SkillDetail] track install:", e));
      const userEmail = user.email;
      if (userEmail) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        fetch(`https://${projectId}.supabase.co/functions/v1/enroll-sequence`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, sequence_name: "post_install", metadata: { skill_name: skill.display_name, skill_slug: skill.slug } }),
        }).catch(e => console.error("[SkillDetail] enroll-sequence:", e));
      }
    } else {
      setShowEmailGate(true);
    }
  };

  const handleEmailCaptured = (email: string) => {
    if (pendingAction === "zip") performZipDownload();
    else performCopy();
    toast.success(t("emailGate.success", "¡Listo! Revisá tu email para tips de uso."));
  };

  const performZipDownload = async () => {
    const zip = new JSZip();
    const folderName = skill.slug || skill.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    zip.file(`${folderName}/SKILL.md`, skill.install_command);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${folderName}.zip`; a.click();
    URL.revokeObjectURL(url);
    toast.success(t("detail.zipDownloaded", "ZIP descargado — subilo a Claude.ai en Settings → Features"));
  };

  const handleDownloadZip = async () => {
    if (user) {
      await performZipDownload();
      trackInstallation(skill.id, user.id).catch(e => console.error("[SkillDetail] track install:", e));
      const userEmail = user.email;
      if (userEmail) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        fetch(`https://${projectId}.supabase.co/functions/v1/enroll-sequence`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, sequence_name: "post_install", metadata: { skill_name: skill.display_name, skill_slug: skill.slug } }),
        }).catch(e => console.error("[SkillDetail] enroll-sequence:", e));
      }
    } else {
      setPendingAction("zip");
      setShowEmailGate(true);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await createReview({ skill_id: skill.id, user_id: user.id, rating: reviewRating, time_saved: reviewTimeSaved || undefined, comment: reviewComment || undefined });
      toast.success(t("detail.reviewSuccess"));
      setShowReviewForm(false); setReviewComment(""); setReviewTimeSaved("");
      refetchReviews();
    } catch { toast.error(t("detail.reviewError")); }
    setSubmitting(false);
  };

  const handleConvertToPlugin = async () => {
    if (!user || !skill) return;
    setConvertingToPlugin(true);
    try {
      const skillData = { name: skill.display_name, tagline: skill.tagline, description: skill.description_human, install_command: skill.install_command };
      const { data: wrapper, error: wrapError } = await supabase.functions.invoke("generate-skill", { body: { action: "wrap_plugin", skill: skillData } });
      if (wrapError) throw wrapError;
      await submitPlugin({ slug: skill.slug, name: wrapper.plugin_name || skill.display_name, description: wrapper.plugin_description || skill.tagline, category: skill.category, creator_id: user.id, source: "community" });
      toast.success("¡Plugin publicado! Aparecerá en la sección Plugins.");
    } catch (e: any) {
      if (e?.code === "23505") toast.error("Ya existe un plugin con este nombre");
      else toast.error("Error al convertir a plugin");
    }
    setConvertingToPlugin(false);
  };

  const isEs = i18n.language === "es";

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
            <ArrowLeft className="w-4 h-4" /> {t("detail.backToDirectory")}
          </Link>

          {/* 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
            {/* ─── Main Column ─── */}
            <div className="min-w-0 order-1 lg:order-none">
              <SkillHero displayName={displayName} tagline={tagline} industry={skill.industry} />

              {/* Version + Changelog */}
              {(skill.version || skill.changelog) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center gap-3">
                  {skill.version && (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border">
                      v{skill.version}
                    </span>
                  )}
                  {skill.changelog && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {isEs ? "Ver changelog" : "View changelog"}
                      </summary>
                      <pre className="mt-2 p-3 rounded-xl bg-secondary text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {skill.changelog}
                      </pre>
                    </details>
                  )}
                </motion.div>
              )}
              {/* Multi-agent install */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <MultiAgentInstall
                  itemType="skill"
                  itemName={skill.display_name}
                  itemSlug={skill.slug}
                  installContent={skill.install_command}
                  githubUrl={skill.github_url}
                  onInstallAction={(agent, method) => {
                    if (user) {
                      trackInstallation(skill.id, user.id).catch(e => console.error("[SkillDetail] track install:", e));
                    }
                  }}
                />
                {user && skill.creator_id === user.id && (
                  <button onClick={handleConvertToPlugin} disabled={convertingToPlugin} className="mt-3 inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border text-foreground font-medium hover:bg-secondary transition-colors text-sm disabled:opacity-50">
                    {convertingToPlugin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    {t("detail.publishAsPlugin", "Publicar como plugin")}
                  </button>
                )}
              </motion.div>

              {/* Description */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">{isEs ? "Descripción" : "Description"}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">{descriptionHuman}</p>

                {/* AI summary */}
                {(() => {
                  const summaryEs = skill.readme_summary_es;
                  const summaryEn = skill.readme_summary;
                  let summary = (isEs && summaryEs) ? summaryEs : summaryEn;
                  if (!summary) return null;
                  // Remove "What it does" section (already shown above as descriptionHuman)
                  summary = summary.replace(/^##?\s*(What it does|Qué hace|Que hace)\s*\n[\s\S]*?(?=\n##?\s|\n\*\*[A-Z]|$)/im, "").trim();
                  summary = summary.replace(/^\*\*(What it does|Qué hace|Que hace)\*\*\s*\n[\s\S]*?(?=\n\*\*[A-Z]|$)/im, "").trim();
                  if (!summary) return null;
                  return (
                    <div className="mb-6 prose prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-headings:mt-6 prose-headings:mb-3 prose-p:text-muted-foreground prose-p:mb-3 prose-p:leading-relaxed prose-li:text-muted-foreground prose-li:mb-1 prose-ul:mb-4 prose-ol:mb-4 prose-strong:text-foreground">
                      <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                  );
                })()}
              </motion.div>

              {/* Parsed SKILL.md Sections */}
              {parsedMd && (parsedMd.prerequisites.length > 0 || parsedMd.tools.length > 0 || parsedMd.workflows.length > 0 || parsedMd.pitfalls.length > 0) && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-10 space-y-6">
                  {/* Prerequisites */}
                  {parsedMd.prerequisites.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-muted-foreground" />
                        {isEs ? "Requisitos previos" : "Prerequisites"}
                      </h3>
                      <ul className="space-y-2">
                        {parsedMd.prerequisites.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tools */}
                  {parsedMd.tools.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-muted-foreground" />
                        {isEs ? "Herramientas" : "Tools"}
                      </h3>
                      <div className="grid gap-2">
                        {parsedMd.tools.map((tool, i) => (
                          <div key={i} className="p-3 rounded-xl bg-secondary">
                            <span className="text-sm font-semibold text-foreground">{tool.name}</span>
                            {tool.description && <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Workflows */}
                  {parsedMd.workflows.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-muted-foreground" />
                        {isEs ? "Flujos de trabajo" : "Workflows"}
                      </h3>
                      {parsedMd.workflows.map((wf, i) => (
                        <div key={i} className="mb-4">
                          <h4 className="text-sm font-semibold text-foreground mb-2">{wf.title}</h4>
                          <ol className="space-y-1 list-decimal list-inside text-sm text-muted-foreground">
                            {wf.steps.map((step, si) => <li key={si}>{step}</li>)}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pitfalls */}
                  {parsedMd.pitfalls.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        {isEs ? "Advertencias" : "Known Pitfalls"}
                      </h3>
                      <ul className="space-y-2">
                        {parsedMd.pitfalls.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 p-3 rounded-xl bg-amber-500/10">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Required MCPs */}
              {(() => {
                const requiredMcps = skill.required_mcps;
                if (!requiredMcps || !Array.isArray(requiredMcps) || requiredMcps.length === 0) return null;
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Plug className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">{t("detail.requiresMcps")}</h3>
                    </div>
                    <div className="grid gap-3">
                      {requiredMcps.map((mcp: any, i: number) => (
                        <div key={i} className="p-4 rounded-2xl border border-border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{mcp.name}</span>
                              {mcp.url && <a href={mcp.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3.5 h-3.5" /></a>}
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${mcp.optional ? "bg-secondary text-muted-foreground" : "bg-foreground/10 text-foreground"}`}>
                              {mcp.optional ? t("detail.mcpOptional") : t("detail.mcpRequired")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{mcp.description}</p>
                          {mcp.required_tools?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {mcp.required_tools.map((tool: string, ti: number) => <code key={ti} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">{tool}</code>)}
                            </div>
                          )}
                          {mcp.install_command && <div className="mt-2 p-2.5 rounded-xl bg-secondary"><code className="text-xs text-foreground font-mono">{mcp.install_command}</code></div>}
                          {mcp.credentials_needed?.length > 0 && <p className="text-xs text-muted-foreground mt-2">🔑 {t("detail.mcpCredentials")}: {mcp.credentials_needed.join(", ")}</p>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Use cases */}
              {useCases.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
                  <h3 className="text-lg font-semibold mb-4">{t("detail.useCases")}</h3>
                  <div className="grid gap-3">
                    {useCases.map((uc) => (
                      <div key={uc.title} className="p-5 rounded-2xl bg-secondary">
                        <h4 className="font-semibold mb-1">{uc.title}</h4>
                        <p className="text-sm text-muted-foreground">{uc.after}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Original SKILL.md Content */}
              {skill.install_command && skill.install_command.length > 100 && /^---\n/.test(skill.install_command) && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-10">
                  <details className="group">
                    <summary className="flex items-center gap-2 text-lg font-semibold cursor-pointer hover:text-muted-foreground transition-colors list-none">
                      <FileArchive className="w-5 h-5" />
                      {isEs ? "Ver SKILL.md original" : "View original SKILL.md"}
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-4 p-4 rounded-2xl bg-secondary border border-border overflow-x-auto">
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                        {skill.install_command}
                      </pre>
                    </div>
                  </details>
                </motion.div>
              )}

              {/* Full README */}
              {skill.readme_raw && skill.readme_raw.length > 10 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
                  <button onClick={() => setShowFullReadme(!showFullReadme)} className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-muted-foreground transition-colors">
                    <BookOpen className="w-5 h-5" />
                    {isEs ? "Documentación completa" : "Full documentation"}
                    {showFullReadme ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showFullReadme && (
                    <div className="p-6 rounded-2xl bg-secondary prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-background overflow-x-auto">
                      <ReactMarkdown>{skill.readme_raw}</ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Reviews */}
              {(reviews.length > 0 || user) && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">{t("detail.reviewsTitle")}</h2>
                    {user && !showReviewForm && (
                      <button onClick={() => setShowReviewForm(true)} className="text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity">{t("detail.leaveReview")}</button>
                    )}
                  </div>

                  {showReviewForm && (
                    <div className="p-6 rounded-2xl bg-secondary mb-6">
                      <div className="mb-4">
                        <label className="text-sm font-medium mb-2 block">{t("detail.rating")}</label>
                        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => setReviewRating(n)}><Star className={`w-5 h-5 ${n <= reviewRating ? "fill-foreground text-foreground" : "text-muted-foreground"}`} /></button>))}</div>
                      </div>
                      <div className="mb-4">
                        <label className="text-sm font-medium mb-2 block">{t("detail.timeSaved")}</label>
                        <input value={reviewTimeSaved} onChange={(e) => setReviewTimeSaved(e.target.value)} placeholder={t("detail.timeSavedPlaceholder")} className="w-full px-4 py-3 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                      </div>
                      <div className="mb-4">
                        <label className="text-sm font-medium mb-2 block">{t("detail.tellUs")}</label>
                        <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} placeholder={t("detail.tellUsPlaceholder")} className="w-full px-4 py-3 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none" />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleSubmitReview} disabled={submitting} className="text-sm font-medium px-6 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50">{submitting ? t("detail.publishing") : t("detail.publishReview")}</button>
                        <button onClick={() => setShowReviewForm(false)} className="text-sm text-muted-foreground hover:text-foreground">{t("detail.cancel")}</button>
                      </div>
                    </div>
                  )}

                  {reviews.length > 0 && (
                    <div className="grid gap-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="p-6 rounded-2xl bg-secondary">
                          <div className="flex items-center gap-1 mb-3">{Array.from({ length: review.rating }).map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-foreground text-foreground" />))}</div>
                          {review.comment && <p className="text-base mb-4 leading-relaxed">"{review.comment}"</p>}
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString(isEs ? "es-AR" : "en-US")}</p>
                            {review.time_saved && <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-background text-muted-foreground">{t("detail.saves")} {review.time_saved}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Help link */}
              <div className="mt-10 p-6 rounded-2xl bg-secondary text-center">
                <p className="text-sm text-muted-foreground mb-2">{t("detail.stuckTitle")}</p>
                <Link to="/primeros-pasos" className="text-sm font-medium text-foreground hover:underline">{t("detail.stuckLink")}</Link>
              </div>

              {/* FAQ */}
              <DetailFAQ
                itemType="skill"
                itemName={displayName}
                description={descriptionHuman}
                category={skill.category}
                securityStatus={skill.security_status}
              />
            </div>

            {/* ─── Sidebar ─── */}
            <SkillSidebar skill={skill} creatorProfile={creatorProfile} />
          </div>
        </div>
      </div>

      <EmailGateDialog
        open={showEmailGate}
        onOpenChange={setShowEmailGate}
        skillId={skill.id}
        skillName={skill.display_name}
        skillSlug={skill.slug}
        onEmailCaptured={handleEmailCaptured}
      />
    </div>
  );
};

export default SkillDetail;
