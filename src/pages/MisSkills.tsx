import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Eye, Clock, Star, Download, BarChart3, Loader2, Globe, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserSkills, type SkillFromDB } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "En revisión", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  approved: { label: "Publicada", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  rejected: { label: "Rechazada", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

export default function MisSkills() {
  const { user, loading } = useAuth();
  const [skills, setSkills] = useState<SkillFromDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserSkills(user.id).then((data) => {
        setSkills(data);
        setIsLoading(false);
      });
    }
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const totalInstalls = skills.reduce((sum, s) => sum + (s.github_stars || s.install_count), 0);
  const avgRating = skills.length > 0
    ? (skills.reduce((sum, s) => sum + s.avg_rating, 0) / skills.length).toFixed(1)
    : "0";
  const publishedCount = skills.filter((s) => s.status === "approved").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 max-w-4xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mis Skills</h1>
            <p className="text-sm text-muted-foreground">Gestioná las skills que creaste</p>
          </div>
          <Link to="/crear-skill">
            <Button className="rounded-full gap-2">
              <Plus className="w-4 h-4" /> Crear skill
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total skills</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{skills.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Publicadas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Download className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Instalaciones</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalInstalls}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Rating prom.</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgRating}</p>
          </div>
        </div>

        {/* Skills list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Todavía no creaste ninguna skill</p>
            <Link to="/crear-skill">
              <Button className="rounded-full gap-2">
                <Plus className="w-4 h-4" /> Crear mi primera skill
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {skills.map((skill, i) => {
              const status = statusLabels[skill.status] || statusLabels.pending;
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
                            {(skill as any).is_public === false && (
                              <Badge variant="outline" className="shrink-0 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Lock className="w-2.5 h-2.5 mr-1" /> Privada
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{skill.tagline}</p>
                        </Link>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1" title="Instalaciones">
                              <Download className="w-3 h-3" />
                              {skill.github_stars || skill.install_count}
                            </div>
                            <div className="flex items-center gap-1" title="Rating">
                              <Star className="w-3 h-3" />
                              {skill.avg_rating}
                            </div>
                            <div className="flex items-center gap-1" title="Fecha">
                              <Clock className="w-3 h-3" />
                              {new Date(skill.created_at).toLocaleDateString("es")}
                            </div>
                          </div>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const newPublic = !(skill as any).is_public !== false;
                              const updates: any = { is_public: !((skill as any).is_public !== false) };
                              // If making private and no share_token, generate one
                              if (updates.is_public === false && !(skill as any).share_token) {
                                updates.share_token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
                              }
                              const { error } = await supabase.from("skills").update(updates).eq("id", skill.id);
                              if (error) {
                                toast.error("Error al cambiar visibilidad");
                                return;
                              }
                              setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, ...updates } : s));
                              toast.success(updates.is_public ? "Skill ahora es pública" : "Skill ahora es privada");
                            }}
                            className="p-2 rounded-xl hover:bg-secondary transition-colors"
                            title={(skill as any).is_public !== false ? "Hacer privada" : "Hacer pública"}
                          >
                            {(skill as any).is_public !== false
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
