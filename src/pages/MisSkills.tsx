import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Eye, Clock, Star, Download, BarChart3, Loader2, Globe, Lock, Trash2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { fetchUserSkills, type SkillFromDB } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Draft {
  id: string;
  generated_skill: any;
  quality_score: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function MisSkills() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillFromDB[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchUserSkills(user.id),
        supabase
          .from("skill_drafts")
          .select("id, generated_skill, quality_score, status, created_at, updated_at")
          .eq("user_id", user.id)
          .neq("status", "published")
          .order("updated_at", { ascending: false }),
      ]).then(([skillsData, { data: draftsData }]) => {
        setSkills(skillsData);
        setDrafts((draftsData as Draft[]) || []);
        setIsLoading(false);
      });
    }
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const statusLabels: Record<string, { label: string; className: string }> = {
    pending: { label: t("misSkills.statusPending"), className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    approved: { label: t("misSkills.statusApproved"), className: "bg-green-500/10 text-green-600 dark:text-green-400" },
    rejected: { label: t("misSkills.statusRejected"), className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  };

  const draftStatusLabels: Record<string, string> = {
    interviewing: t("misSkills.draftStatus_interviewing"),
    generated: t("misSkills.draftStatus_generated"),
    tested: t("misSkills.draftStatus_tested"),
  };

  const totalInstalls = skills.reduce((sum, s) => sum + (s.github_stars || s.install_count), 0);
  const avgRating = skills.length > 0
    ? (skills.reduce((sum, s) => sum + s.avg_rating, 0) / skills.length).toFixed(1)
    : "0";
  const publishedCount = skills.filter((s) => s.status === "approved").length;

  const isPublic = (skill: SkillFromDB) => (skill as any).is_public !== false;

  const handleDeleteDraft = async (draftId: string) => {
    const { error } = await supabase.from("skill_drafts").delete().eq("id", draftId);
    if (error) return;
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    toast.success(t("misSkills.draftDeleted"));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 max-w-4xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("misSkills.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("misSkills.subtitle")}</p>
          </div>
          <Link to="/crear-skill">
            <Button className="rounded-full gap-2">
              <Plus className="w-4 h-4" /> {t("misSkills.createSkill")}
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{t("misSkills.totalSkills")}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{skills.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{t("misSkills.published")}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Download className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{t("misSkills.installations")}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalInstalls}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{t("misSkills.avgRating")}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgRating}</p>
          </div>
        </div>

        {/* Drafts section */}
        {!isLoading && drafts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">{t("misSkills.draftsTitle")}</h2>
            <div className="space-y-3">
              {drafts.map((draft, i) => {
                const name = draft.generated_skill?.name || t("misSkills.draftNoName");
                const statusLabel = draftStatusLabels[draft.status] || draft.status;
                return (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{name}</h3>
                            <Badge variant="outline" className="shrink-0 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {statusLabel}
                            </Badge>
                            {draft.quality_score != null && (
                              <span className="text-xs text-muted-foreground">
                                {t("misSkills.draftScore", { score: draft.quality_score })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(draft.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link to={`/crear-skill?draft=${draft.id}`}>
                            <Button size="sm" variant="outline" className="rounded-full gap-1.5">
                              <ArrowRight className="w-3.5 h-3.5" />
                              {t("misSkills.draftContinue")}
                            </Button>
                          </Link>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                            title={t("misSkills.draftDelete")}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skills list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : skills.length === 0 && drafts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">{t("misSkills.noSkills")}</p>
            <Link to="/crear-skill">
              <Button className="rounded-full gap-2">
                <Plus className="w-4 h-4" /> {t("misSkills.createFirst")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {skills.map((skill, i) => {
              const status = statusLabels[skill.status] || statusLabels.pending;
              const skillIsPublic = isPublic(skill);
              return (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="rounded-2xl border border-border bg-card p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <Link to={`/skill/${skill.slug}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{skill.display_name}</h3>
                          <Badge variant="outline" className={`shrink-0 text-[10px] ${status.className}`}>
                            {status.label}
                          </Badge>
                          {!skillIsPublic && (
                            <Badge variant="outline" className="shrink-0 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <Lock className="w-2.5 h-2.5 mr-1" /> {t("misSkills.private")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{skill.tagline}</p>
                      </Link>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1" title={t("misSkills.installations")}>
                            <Download className="w-3 h-3" />
                            {skill.github_stars || skill.install_count}
                          </div>
                          <div className="flex items-center gap-1" title="Rating">
                            <Star className="w-3 h-3" />
                            {skill.avg_rating}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(skill.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newIsPublic = !skillIsPublic;
                            const updates: any = { is_public: newIsPublic };
                            if (!newIsPublic && !(skill as any).share_token) {
                              updates.share_token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
                            }
                            const { error } = await supabase.from("skills").update(updates).eq("id", skill.id);
                            if (error) {
                              toast.error(t("misSkills.visibilityError"));
                              return;
                            }
                            setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, ...updates } : s));
                            toast.success(newIsPublic ? t("misSkills.nowPublic") : t("misSkills.nowPrivate"));
                          }}
                          className="p-2 rounded-xl hover:bg-secondary transition-colors"
                          title={skillIsPublic ? t("misSkills.makePrivate") : t("misSkills.makePublic")}
                        >
                          {skillIsPublic
                            ? <Globe className="w-4 h-4 text-muted-foreground" />
                            : <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}