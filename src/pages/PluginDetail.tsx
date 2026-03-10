import { motion } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, BadgeCheck, ShieldCheck, ShieldQuestion, Download, Github, AlertTriangle, Copy, Check, Monitor, Users2, Package, Plug, BookOpen, Star, Award } from "lucide-react";
import { TrustBadge, ScannedByPymaiaBadge } from "@/components/TrustBadge";
import SecurityPanel from "@/components/SecurityPanel";
import SecurityReportButton from "@/components/SecurityReportButton";
import DetailFAQ from "@/components/DetailFAQ";
import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import SkillCard from "@/components/SkillCard";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const PluginDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEs = i18n.language === "es";
  const [copied, setCopied] = useState(false);
  const [showFullReadme, setShowFullReadme] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/plugins");
  }, [navigate]);

  const { data: plugin, isLoading } = useQuery({
    queryKey: ["plugin", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("plugins" as any).select("*").eq("slug", slug!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["plugin-reviews", plugin?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plugin_reviews" as any).select("*").eq("plugin_id", plugin!.id).order("created_at", { ascending: false });
      if (error) return [];
      return data as any[];
    },
    enabled: !!plugin?.id,
  });

  const { data: readme } = useQuery({
    queryKey: ["plugin-readme", plugin?.github_url],
    queryFn: async () => {
      if (!plugin?.github_url) return null;
      const match = plugin.github_url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return null;
      const [, owner, repo] = match;
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`);
      if (!res.ok) { const res2 = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`); if (!res2.ok) return null; return res2.text(); }
      return res.text();
    },
    enabled: !!plugin?.github_url,
    staleTime: 1000 * 60 * 30,
  });

  const { data: relatedSkills = [] } = useQuery({
    queryKey: ["plugin-related-skills", plugin?.name],
    queryFn: async () => {
      if (!plugin?.name) return [];
      const searchTerm = plugin.name.toLowerCase().replace(/-plugin$/, "").replace(/\s+plugin$/i, "");
      const { data, error } = await supabase.from("skills").select("*").eq("status", "approved").or(`display_name.ilike.%${searchTerm}%,tagline.ilike.%${searchTerm}%`).limit(6);
      if (error) return [];
      return data || [];
    },
    enabled: !!plugin,
  });

  const { data: relatedConnectors = [] } = useQuery({
    queryKey: ["plugin-related-connectors", plugin?.name],
    queryFn: async () => {
      if (!plugin?.name) return [];
      const searchTerm = plugin.name.toLowerCase().replace(/-plugin$/, "").replace(/\s+plugin$/i, "");
      const { data, error } = await supabase.from("mcp_servers").select("name, slug, icon_url, category, description, description_es").eq("status", "approved").or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`).limit(6);
      if (error) return [];
      return data || [];
    },
    enabled: !!plugin,
  });

  const pluginId = plugin?.homepage?.match(/claude\.com\/plugins\/([^/?#]+)/)?.[1] || plugin?.slug?.replace(/-plugin$/, "");
  const coworkUrl = plugin?.is_official
    ? `https://claude.ai/redirect/claudedotcom.v1.0920c6c1-6b38-4271-8d4e-842e466c7ca3/desktop/customize/plugins/new?marketplace=anthropics/knowledge-work-plugins&plugin=${pluginId}`
    : plugin?.github_url || plugin?.homepage || "#";
  const codeCommand = plugin?.is_official
    ? `claude plugin install ${pluginId}@claude-plugins-official`
    : plugin?.github_url ? `claude plugin install ${plugin.github_url}` : `claude plugin install ${pluginId}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeCommand]);

  const showCowork = plugin?.platform === "cowork" || plugin?.platform === "both";
  const showCode = plugin?.platform === "claude-code" || plugin?.platform === "both";

  const handleSubmitReview = async () => {
    if (!user || !plugin) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("plugin_reviews" as any).insert({ plugin_id: plugin.id, user_id: user.id, rating: reviewRating, comment: reviewComment || null });
      if (error) throw error;
      toast.success(isEs ? "¡Review enviada!" : "Review submitted!");
      setShowReviewForm(false); setReviewComment("");
      refetchReviews();
      queryClient.invalidateQueries({ queryKey: ["plugin", slug] });
    } catch (e: any) {
      if (e?.code === "23505") toast.error(isEs ? "Ya dejaste una review para este plugin" : "You already reviewed this plugin");
      else toast.error(isEs ? "Error al enviar review" : "Error submitting review");
    }
    setSubmittingReview(false);
  };

  useSEO({ title: plugin ? `${plugin.name} — Plugins` : "Plugin", description: plugin?.description || "" });

  if (isLoading) {
    return (<div className="min-h-screen bg-background"><div className="pt-14 max-w-6xl mx-auto px-6 py-16"><div className="h-8 w-48 bg-secondary animate-pulse rounded mb-4" /><div className="h-4 w-96 bg-secondary animate-pulse rounded" /></div></div>);
  }

  if (!plugin) {
    return (<div className="min-h-screen bg-background"><div className="pt-14 max-w-6xl mx-auto px-6 py-16 text-center"><p className="text-muted-foreground text-lg">Plugin not found</p><Link to="/plugins" className="text-primary hover:underline mt-4 inline-block">{t("plugins.backToPlugins")}</Link></div></div>);
  }

  const isPymaiaVerified = plugin.source === "community" && plugin.creator_id;

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <button onClick={handleBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("plugins.backToPlugins")}
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Hero */}
            <div className="flex items-center gap-4 mb-6">
              {plugin.icon_url ? <img src={plugin.icon_url} alt={plugin.name} className="w-14 h-14 rounded-xl" /> : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center"><span className="text-2xl font-bold text-primary">{plugin.name[0]?.toUpperCase()}</span></div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{isEs && plugin.name_es ? plugin.name_es : plugin.name}</h1>
                  {plugin.is_anthropic_verified && <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                </div>
                <span className="text-sm text-muted-foreground">{plugin.platform === "both" ? "Claude Code + Cowork" : plugin.platform === "claude-code" ? "Claude Code" : "Cowork"}</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-6 text-lg max-w-3xl">{isEs && plugin.description_es ? plugin.description_es : plugin.description}</p>
          </motion.div>

          {/* 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
            {/* ─── Main Column ─── */}
            <div className="min-w-0">
              {/* Install options */}
              <div className="mb-8 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground mb-2">{isEs ? "Instalar en" : "Install in"}</p>
                {showCowork && (
                  <a href={coworkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-opacity group">
                    <div className="flex items-center gap-3"><Users2 className="w-5 h-5" /><span>Claude Cowork</span></div>
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                {showCode && (
                  <button onClick={handleCopy} className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-secondary border border-border text-foreground font-semibold hover:bg-secondary/80 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <Monitor className="w-5 h-5 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <span className="block">Claude Code</span>
                        <code className="text-xs text-muted-foreground font-mono truncate block max-w-[300px] sm:max-w-[400px]">{codeCommand}</code>
                      </div>
                    </div>
                    {copied ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Copy className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
                  </button>
                )}
              </div>

              {/* Security warning */}
              {!plugin.is_official && plugin.security_status !== "verified" && !isPymaiaVerified && (
                <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">{t("plugins.securityWarningTitle")}</p>
                      <p className="text-sm text-muted-foreground">{t("plugins.securityWarning")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Connectors */}
              {relatedConnectors.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Plug className="w-4 h-4" />{isEs ? "Conectores relacionados" : "Related connectors"}</h2>
                  <div className="space-y-2">
                    {relatedConnectors.map((conn: any) => (
                      <Link key={conn.slug} to={`/conector/${conn.slug}`} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border hover:border-foreground/20 transition-colors">
                        {conn.icon_url ? <img src={conn.icon_url} alt={conn.name} className="w-8 h-8 rounded-lg object-contain" /> : <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><span className="text-sm font-bold text-primary">{conn.name[0]}</span></div>}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{conn.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{isEs && conn.description_es ? conn.description_es : conn.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* README */}
              {readme && (
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" />{isEs ? "Documentación" : "Documentation"}</h2>
                  <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
                    <div className={`prose prose-sm dark:prose-invert max-w-none ${!showFullReadme ? "max-h-[300px] overflow-hidden relative" : ""}`}>
                      <ReactMarkdown>{readme}</ReactMarkdown>
                      {!showFullReadme && <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-secondary/50 to-transparent" />}
                    </div>
                    <button onClick={() => setShowFullReadme(!showFullReadme)} className="mt-3 text-sm text-primary hover:underline font-medium">
                      {showFullReadme ? (isEs ? "Mostrar menos" : "Show less") : (isEs ? "Leer documentación completa" : "Read full documentation")}
                    </button>
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Star className="w-4 h-4" />Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>
                  {user && !showReviewForm && <button onClick={() => setShowReviewForm(true)} className="text-sm text-primary hover:underline font-medium">{isEs ? "Dejar review" : "Write review"}</button>}
                </div>
                {showReviewForm && user && (
                  <div className="p-5 rounded-2xl border border-border bg-card mb-4">
                    <div className="flex items-center gap-1 mb-3">{[1, 2, 3, 4, 5].map((s) => (<button key={s} onClick={() => setReviewRating(s)}><Star className={`w-6 h-6 transition-colors ${s <= reviewRating ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`} /></button>))}</div>
                    <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder={isEs ? "Comentario opcional..." : "Optional comment..."} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground resize-none min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring mb-3" />
                    <div className="flex gap-2">
                      <button onClick={handleSubmitReview} disabled={submittingReview} className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50">{submittingReview ? (isEs ? "Enviando..." : "Submitting...") : (isEs ? "Enviar" : "Submit")}</button>
                      <button onClick={() => setShowReviewForm(false)} className="px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80">{isEs ? "Cancelar" : "Cancel"}</button>
                    </div>
                  </div>
                )}
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="p-4 rounded-xl bg-secondary/50 border border-border">
                        <div className="flex items-center gap-1 mb-2">{[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`} />))}<span className="text-xs text-muted-foreground ml-2">{new Date(review.created_at).toLocaleDateString()}</span></div>
                        {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{isEs ? "Todavía no hay reviews. ¡Sé el primero!" : "No reviews yet. Be the first!"}</p>
                )}
              </div>

              {/* Related Skills */}
              {relatedSkills.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Package className="w-4 h-4" />{isEs ? "Skills relacionadas" : "Related skills"}</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {relatedSkills.map((skill: any, i: number) => <SkillCard key={skill.id} skill={skill} index={i} />)}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Sidebar ─── */}
            <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
              {/* Badges & stats */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <TrustBadge trustScore={(plugin as any).trust_score || 0} securityStatus={(plugin as any).security_status} scanResult={(plugin as any).security_scan_result} showWarnings itemType="plugin" createdAt={plugin.created_at} isOfficial={plugin.is_official} creatorId={plugin.creator_id} />
                  {(plugin as any).security_scanned_at && <ScannedByPymaiaBadge />}
                </div>

                <div className="flex flex-wrap gap-2">
                  {plugin.is_anthropic_verified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold"><BadgeCheck className="w-3.5 h-3.5" />Anthropic Verified</span>
                  ) : isPymaiaVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold"><Award className="w-3.5 h-3.5" />Pymaia Verified</span>
                  ) : plugin.is_official ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold"><ShieldCheck className="w-3.5 h-3.5" />{isEs ? "Oficial" : "Official"}</span>
                  ) : null}

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold">
                    {plugin.platform === "both" ? "Claude Code + Cowork" : plugin.platform === "claude-code" ? "Claude Code" : "Cowork"}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {plugin.install_count > 0 && <div className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />{plugin.install_count.toLocaleString()} installs</div>}
                  {plugin.avg_rating > 0 && <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-foreground text-foreground" />{Number(plugin.avg_rating).toFixed(1)} ({plugin.review_count})</div>}
                  {plugin.github_stars > 0 && <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" />{plugin.github_stars.toLocaleString()} stars</div>}
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                  {plugin.github_url && <a href={plugin.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Github className="w-4 h-4" />{isEs ? "Ver código fuente" : "View source code"}</a>}
                </div>

                <div className="border-t border-border pt-3">
                  <SecurityReportButton itemType="plugin" itemId={plugin.id} itemSlug={plugin.slug} />
                </div>
              </div>

              {/* Security Panel */}
              <SecurityPanel
                trustScore={(plugin as any).trust_score || 0}
                securityStatus={(plugin as any).security_status}
                securityScannedAt={(plugin as any).security_scanned_at}
                scanResult={(plugin as any).security_scan_result}
                createdAt={plugin.created_at}
                isOfficial={plugin.is_official}
                creatorId={plugin.creator_id}
                creatorName={null} creatorUsername={null} creatorAvatarUrl={null}
                lastCommitAt={(plugin as any).last_commit_at}
                itemType="plugin"
              />

              {/* What are plugins */}
              <div className="p-5 rounded-2xl bg-secondary/50 border border-border">
                <h3 className="font-semibold text-foreground mb-2 text-sm">{t("plugins.whatArePlugins")}</h3>
                <p className="text-xs text-muted-foreground">{t("plugins.whatArePluginsDesc")}</p>
              </div>

              {/* FAQ */}
              <DetailFAQ
                itemType="plugin"
                itemName={isEs && plugin.name_es ? plugin.name_es : plugin.name}
                description={isEs && plugin.description_es ? plugin.description_es : plugin.description}
                category={plugin.category}
                securityStatus={(plugin as any).security_status}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginDetail;
