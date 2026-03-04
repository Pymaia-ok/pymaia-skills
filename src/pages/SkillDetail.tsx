import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ArrowLeft, Copy, Check, Clock, Download, ExternalLink, User } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import { fetchSkillBySlug, fetchReviewsForSkill, createReview, parseUseCases, trackInstallation, fetchProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const SkillDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTimeSaved, setReviewTimeSaved] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: skill, isLoading } = useQuery({ queryKey: ["skill", slug], queryFn: () => fetchSkillBySlug(slug || ""), enabled: !!slug });
  const { data: reviews = [], refetch: refetchReviews } = useQuery({ queryKey: ["reviews", skill?.id], queryFn: () => fetchReviewsForSkill(skill!.id), enabled: !!skill?.id });
  const { data: creatorProfile } = useQuery({ queryKey: ["creator", skill?.creator_id], queryFn: () => fetchProfile(skill!.creator_id!), enabled: !!skill?.creator_id });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
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
      <div className="min-h-screen bg-background"><Navbar />
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="section-title mb-4">{t("detail.notFound")}</h1>
          <Link to="/explorar" className="text-muted-foreground hover:text-foreground">← {t("detail.backToDirectory")}</Link>
        </div>
      </div>
    );
  }

  const useCases = parseUseCases(skill.use_cases);
  const tagline = (i18n.language === "es" && skill.tagline_es) ? skill.tagline_es : skill.tagline;
  const descriptionHuman = (i18n.language === "es" && skill.description_human_es) ? skill.description_human_es : skill.description_human;

  const handleCopy = () => {
    navigator.clipboard.writeText(skill.install_command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (user) trackInstallation(skill.id, user.id).catch(() => {});
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
      <Navbar />
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
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{skill.display_name}</h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">{tagline}</p>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold hover:opacity-90 transition-opacity text-base">
                {copied ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                {copied ? t("detail.commandCopied") : t("detail.installSkill")}
              </button>
              <span className="text-sm text-muted-foreground">{t("detail.copyHint")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-foreground text-foreground" />
                <span className="font-medium text-foreground">{Number(skill.avg_rating).toFixed(1)}</span>
                <span>({skill.review_count} {t("detail.reviews")})</span>
              </div>
              <div className="flex items-center gap-1.5"><Download className="w-4 h-4" /><span>{skill.install_count.toLocaleString()} {t("detail.installs")}</span></div>
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
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">{t("detail.whatItDoes")}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">{descriptionHuman}</p>
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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold">{t("detail.reviewsTitle")}</h2>
              {user && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)} className="text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity">{t("detail.leaveReview")}</button>
              )}
              {!user && <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">{t("detail.signInToReview")}</Link>}
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

            {reviews.length > 0 ? (
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
            ) : (
              <p className="text-muted-foreground text-center py-8">{t("detail.noReviews")}</p>
            )}
          </motion.div>

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
        </div>
      </div>
    </div>
  );
};

export default SkillDetail;
