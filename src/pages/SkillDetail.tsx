import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ArrowLeft, Copy, Check, Clock, Download, ExternalLink, User, Heart, ChevronDown, ChevronUp, BookOpen, Plug, ShieldCheck, Activity, Lock, FileArchive } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import EmailGateDialog from "@/components/EmailGateDialog";
import { fetchSkillBySlug, fetchReviewsForSkill, createReview, parseUseCases, trackInstallation, fetchProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import ShareButton from "@/components/ShareButton";
import JSZip from "jszip";

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

  // Support share_token for private skills
  const searchParams = new URLSearchParams(window.location.search);
  const shareToken = searchParams.get("token");

  const { data: skill, isLoading } = useQuery({ queryKey: ["skill", slug, shareToken], queryFn: () => fetchSkillBySlug(slug || "", shareToken || undefined), enabled: !!slug });
  const { data: reviews = [], refetch: refetchReviews } = useQuery({ queryKey: ["reviews", skill?.id], queryFn: () => fetchReviewsForSkill(skill!.id), enabled: !!skill?.id });
  const { data: creatorProfile } = useQuery({ queryKey: ["creator", skill?.creator_id], queryFn: () => fetchProfile(skill!.creator_id!), enabled: !!skill?.creator_id });

  const useCases = skill ? parseUseCases(skill.use_cases) : [];
  const displayName = skill ? ((i18n.language === "es" && skill.display_name_es) ? skill.display_name_es : skill.display_name) : "";
  const tagline = skill ? ((i18n.language === "es" && skill.tagline_es) ? skill.tagline_es : skill.tagline) : "";
  const descriptionHuman = skill ? ((i18n.language === "es" && skill.description_human_es) ? skill.description_human_es : skill.description_human) : "";

  useSEO({
    title: skill ? `${displayName} — ${tagline}` : "Loading...",
    description: skill ? `${descriptionHuman.slice(0, 150)}. ${skill.review_count > 0 ? `⭐ ${Number(skill.avg_rating).toFixed(1)} (${skill.review_count} reviews) · ` : ""}${skill.github_stars > 0 ? `★ ${skill.github_stars.toLocaleString()} GitHub stars · ` : ""}${skill.install_count > 0 ? `${skill.install_count} installs.` : ""}` : "",
    canonical: skill ? `https://pymaiaskills.lovable.app/skill/${skill.slug}` : "",
    jsonLd: skill ? {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: skill.display_name,
      description: descriptionHuman,
      url: `https://pymaiaskills.lovable.app/skill/${skill.slug}`,
      applicationCategory: skill.category,
      operatingSystem: "Web",
      installUrl: `https://pymaiaskills.lovable.app/skill/${skill.slug}`,
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/InstallAction",
        userInteractionCount: skill.install_count,
      },
      aggregateRating: skill.review_count > 0 ? {
        "@type": "AggregateRating",
        ratingValue: Number(skill.avg_rating).toFixed(1),
        reviewCount: skill.review_count,
        bestRating: 5,
        worstRating: 1,
      } : undefined,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    } : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24">
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
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24 text-center">
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
      // Authenticated user: copy directly, track, and enroll in post_install
      performCopy();
      trackInstallation(skill.id, user.id).catch(() => {});
      // Enroll authenticated user in post_install sequence
      const userEmail = user.email;
      if (userEmail) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        fetch(`https://${projectId}.supabase.co/functions/v1/enroll-sequence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            sequence_name: "post_install",
            metadata: { skill_name: skill.display_name, skill_slug: skill.slug },
          }),
        }).catch(() => {});
      }
    } else {
      // Non-authenticated: show email gate
      setShowEmailGate(true);
    }
  };

  const [pendingAction, setPendingAction] = useState<"copy" | "zip">("copy");

  const handleEmailCaptured = (email: string) => {
    if (pendingAction === "zip") {
      performZipDownload();
    } else {
      performCopy();
    }
    toast.success(t("emailGate.success", "¡Listo! Revisá tu email para tips de uso."));
  };

  const performZipDownload = async () => {
    const zip = new JSZip();
    const folderName = skill.slug || skill.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    zip.file(`${folderName}/SKILL.md`, skill.install_command);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("detail.zipDownloaded", "ZIP descargado — subilo a Claude.ai en Settings → Features"));
  };

  const handleDownloadZip = async () => {
    if (user) {
      await performZipDownload();
      trackInstallation(skill.id, user.id).catch(() => {});
      const userEmail = user.email;
      if (userEmail) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        fetch(`https://${projectId}.supabase.co/functions/v1/enroll-sequence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            sequence_name: "post_install",
            metadata: { skill_name: skill.display_name, skill_slug: skill.slug },
          }),
        }).catch(() => {});
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

  const installSteps = [
    { title: t("detail.step1Title"), description: t("detail.step1Desc") },
    { title: t("detail.step2Title"), description: t("detail.step2Desc") },
    { title: t("detail.step3Title"), description: t("detail.step3Desc"), command: skill.install_command },
    { title: t("detail.step4Title"), description: (t("detail.step4Desc") as string).replace("{{tagline}}", tagline.toLowerCase()) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
            <ArrowLeft className="w-4 h-4" /> {t("detail.backToDirectory")}
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              {skill.industry.map((ind) => (
                <span key={ind} className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{ind}</span>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{displayName}</h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">{tagline}</p>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold hover:opacity-90 transition-opacity text-base">
                {copied ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                {copied ? t("detail.commandCopied") : t("detail.installSkill")}
              </button>
              <span className="text-sm text-muted-foreground">{t("detail.copyHint")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
              {(skill as any).security_status === "verified" && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-medium">{t("trust.verified", "Verified")}</span>
                </div>
              )}
              {(skill as any).last_commit_at && (() => {
                const months = (Date.now() - new Date((skill as any).last_commit_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
                return months <= 6 ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Activity className="w-4 h-4" />
                    <span>{t("trust.active", "Active")}</span>
                  </div>
                ) : null;
              })()}
              {skill.review_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-foreground text-foreground" />
                  <span className="font-medium text-foreground">{Number(skill.avg_rating).toFixed(1)}</span>
                  <span>({skill.review_count} {t("detail.reviews")})</span>
                </div>
              )}
              {skill.github_stars > 0 && (
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4" />
                  <span>{skill.github_stars.toLocaleString()} favorites</span>
                </div>
              )}
              <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{skill.time_to_install_minutes} {t("detail.minToInstall")}</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-12">
              {creatorProfile && (
                <Link to={creatorProfile.username ? `/u/${creatorProfile.username}` : "#"} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  {creatorProfile.avatar_url ? <img src={creatorProfile.avatar_url} alt="" className="w-5 h-5 rounded-full" /> : <User className="w-4 h-4" />}
                  <span>{creatorProfile.display_name || creatorProfile.username || t("detail.author")}</span>
                </Link>
              )}
              {skill.github_url && (
                <a href={skill.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <ExternalLink className="w-4 h-4" /><span>{t("detail.viewRepo")}</span>
                </a>
              )}
              {!(skill as any).is_public && (
                <div className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-medium">{t("detail.privateSkill", "Skill privada")}</span>
                </div>
              )}
              <div className="ml-auto">
                <ShareButton
                  url={(() => {
                    const base = `https://pymaiaskills.lovable.app/skill/${skill.slug}`;
                    return (skill as any).is_public === false && (skill as any).share_token
                      ? `${base}?token=${(skill as any).share_token}`
                      : base;
                  })()}
                  title={displayName}
                  description={tagline}
                />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">{t("detail.whatItDoes")}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">{descriptionHuman}</p>

            {/* Required MCPs Section */}
            {(() => {
              const requiredMcps = (skill as any).required_mcps;
              if (!requiredMcps || !Array.isArray(requiredMcps) || requiredMcps.length === 0) return null;
              return (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Plug className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{t("detail.requiresMcps", "Requiere configuración externa")}</h3>
                  </div>
                  <div className="grid gap-3">
                    {requiredMcps.map((mcp: any, i: number) => (
                      <div key={i} className="p-4 rounded-2xl border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{mcp.name}</span>
                            {mcp.url && (
                              <a href={mcp.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${mcp.optional ? "bg-secondary text-muted-foreground" : "bg-foreground/10 text-foreground"}`}>
                            {mcp.optional ? t("detail.mcpOptional", "Opcional") : t("detail.mcpRequired", "Requerido")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{mcp.description}</p>
                        {mcp.required_tools && mcp.required_tools.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {mcp.required_tools.map((tool: string, ti: number) => (
                              <code key={ti} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">{tool}</code>
                            ))}
                          </div>
                        )}
                        {mcp.install_command && (
                          <div className="mt-2 p-2.5 rounded-xl bg-secondary">
                            <code className="text-xs text-foreground font-mono">{mcp.install_command}</code>
                          </div>
                        )}
                        {mcp.credentials_needed && mcp.credentials_needed.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            🔑 {t("detail.mcpCredentials", "Credenciales")}: {mcp.credentials_needed.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            {/* AI-generated summary */}
            {(skill as any).readme_summary && (
              <div className="mb-8 prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                <ReactMarkdown>{(skill as any).readme_summary}</ReactMarkdown>
              </div>
            )}

            {useCases.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-4">{t("detail.useCases")}</h3>
                <div className="grid gap-3">
                  {useCases.map((uc) => (
                    <div key={uc.title} className="p-5 rounded-2xl bg-secondary">
                      <h4 className="font-semibold mb-1">{uc.title}</h4>
                      <p className="text-sm text-muted-foreground">{uc.after}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Full README documentation */}
          {(skill as any).readme_raw && (skill as any).readme_raw.length > 10 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-16">
              <button
                onClick={() => setShowFullReadme(!showFullReadme)}
                className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-muted-foreground transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                {t("detail.fullDocs", "Full documentation")}
                {showFullReadme ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFullReadme && (
                <div className="p-6 rounded-2xl bg-secondary prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-background overflow-x-auto">
                  <ReactMarkdown>{(skill as any).readme_raw}</ReactMarkdown>
                </div>
              )}
            </motion.div>
          )}

          {(reviews.length > 0 || user) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold">{t("detail.reviewsTitle")}</h2>
                {user && !showReviewForm && (
                  <button onClick={() => setShowReviewForm(true)} className="text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity">{t("detail.leaveReview")}</button>
                )}
              </div>

              {showReviewForm && (
                <div className="p-6 rounded-2xl bg-secondary mb-6">
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">{t("detail.rating")}</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setReviewRating(n)}><Star className={`w-5 h-5 ${n <= reviewRating ? "fill-foreground text-foreground" : "text-muted-foreground"}`} /></button>
                      ))}
                    </div>
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
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: review.rating }).map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-foreground text-foreground" />))}
                      </div>
                      {review.comment && <p className="text-base mb-4 leading-relaxed">"{review.comment}"</p>}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString(i18n.language === "es" ? "es-AR" : "en-US")}</p>
                        {review.time_saved && <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-background text-muted-foreground">{t("detail.saves")} {review.time_saved}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="border-t border-border pt-16">
              <h2 className="text-2xl font-semibold mb-2">{t("detail.installGuide")}</h2>
              <p className="text-muted-foreground mb-10">{(t("detail.installGuideSub") as string).replace("{{min}}", String(skill.time_to_install_minutes))}</p>
              <div className="space-y-6">
                {installSteps.map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">{i + 1}</div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      {step.command && (
                        <div className="flex items-center gap-2 p-4 rounded-xl bg-foreground text-background font-mono text-sm">
                          <code className="flex-1">{step.command}</code>
                          <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-background/10 transition-colors">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 p-6 rounded-2xl bg-secondary text-center">
                <p className="text-sm text-muted-foreground mb-2">{t("detail.stuckTitle")}</p>
                <Link to="/primeros-pasos" className="text-sm font-medium text-foreground hover:underline">{t("detail.stuckLink")}</Link>
              </div>
            </div>
          </motion.div>

          <EmailGateDialog
            open={showEmailGate}
            onOpenChange={setShowEmailGate}
            skillId={skill.id}
            skillName={skill.display_name}
            skillSlug={skill.slug}
            onEmailCaptured={handleEmailCaptured}
          />
        </div>
      </div>
    </div>
  );
};

export default SkillDetail;
