import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllSkills, updateSkillStatus, checkIsAdmin } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Clock, Languages, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [translating, setTranslating] = useState(false);
  const abortRef = useRef(false);
  const [batchProgress, setBatchProgress] = useState({ translated: 0, errors: 0 });

  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkIsAdmin(user!.id),
    enabled: !!user?.id,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["admin-skills"],
    queryFn: fetchAllSkills,
    enabled: !!isAdmin,
  });

  // Count translated vs untranslated approved skills
  const { data: translationStats } = useQuery({
    queryKey: ["translation-stats"],
    queryFn: async () => {
      const { count: untranslated } = await supabase
        .from("skills")
        .select("id", { count: "exact", head: true })
        .is("tagline_es", null)
        .eq("status", "approved");
      const { count: total } = await supabase
        .from("skills")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved");
      return { untranslated: untranslated ?? 0, total: total ?? 0 };
    },
    enabled: !!isAdmin,
    refetchInterval: 30000, // refresh every 30s to show progress
  });

  const startTranslation = useCallback(async () => {
    setTranslating(true);
    abortRef.current = false;
    setBatchProgress({ translated: 0, errors: 0 });

    let totalTranslated = 0;
    let consecutiveErrors = 0;

    while (!abortRef.current) {
      try {
        const { data, error } = await supabase.functions.invoke("translate-skills", {
          body: { batchSize: 20 },
        });
        if (error) throw error;
        
        totalTranslated += data.translated ?? 0;
        consecutiveErrors = 0;
        setBatchProgress(p => ({ ...p, translated: totalTranslated }));
        queryClient.invalidateQueries({ queryKey: ["translation-stats"] });

        if ((data.remaining ?? 0) === 0) {
          toast.success(`¡Traducción completa! ${totalTranslated} skills traducidas en esta sesión.`);
          break;
        }

        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        consecutiveErrors++;
        setBatchProgress(p => ({ ...p, errors: p.errors + 1 }));
        if (consecutiveErrors >= 5) {
          toast.error("Demasiados errores consecutivos. Deteniendo.");
          break;
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    setTranslating(false);
  }, [queryClient]);

  const stopTranslation = useCallback(() => {
    abortRef.current = true;
  }, []);

  if (loading || checkingAdmin) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="section-title mb-4">Acceso denegado</h1>
          <p className="text-muted-foreground">No tenés permisos de administrador.</p>
        </div>
      </div>
    );
  }

  const pending = skills.filter(s => s.status === "pending");
  const approved = skills.filter(s => s.status === "approved");
  const rejected = skills.filter(s => s.status === "rejected");
  const totalInstalls = approved.reduce((sum, s) => sum + s.install_count, 0);


  const handleAction = async (skillId: string, status: "approved" | "rejected") => {
    try {
      await updateSkillStatus(skillId, status);
      toast.success(status === "approved" ? "Skill aprobada" : "Skill rechazada");
      queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const translatedCount = translationStats ? translationStats.total - translationStats.untranslated : 0;
  const translationTotal = translationStats?.total ?? 0;
  const translationPercent = translationTotal > 0 ? (translatedCount / translationTotal) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 max-w-5xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="section-title mb-8">Panel de admin</h1>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: "Skills aprobadas", value: approved.length },
              { label: "Pendientes", value: pending.length },
              { label: "Rechazadas", value: rejected.length },
              { label: "Instalaciones totales", value: totalInstalls.toLocaleString() },
            ].map(m => (
              <div key={m.label} className="p-5 rounded-2xl bg-secondary">
                <p className="text-2xl font-bold mb-1">{m.value}</p>
                <p className="text-sm text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Translation Status + Manual Boost */}
          {translationStats && (
            <div className="p-5 rounded-2xl bg-secondary mb-12">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Traducción automática
                </h2>
                {translationStats.untranslated > 0 && (
                  <Button
                    size="sm"
                    variant={translating ? "destructive" : "default"}
                    onClick={translating ? stopTranslation : startTranslation}
                  >
                    {translating ? <><Square className="w-3 h-3 mr-1" /> Detener</> : <><Play className="w-3 h-3 mr-1" /> Traducir todo</>}
                  </Button>
                )}
              </div>
              <Progress value={translationPercent} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                {translatedCount.toLocaleString()} de {translationTotal.toLocaleString()} traducidas
                {translationStats.untranslated > 0 && (
                  <span> · {translationStats.untranslated.toLocaleString()} restantes</span>
                )}
                {translationStats.untranslated === 0 && " · ✓ Completo"}
                {translating && (
                  <span className="text-foreground font-medium"> · Traduciendo... ({batchProgress.translated} en esta sesión)</span>
                )}
              </p>
            </div>
          )}

          {/* Pending Skills */}
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pendientes de aprobación ({pending.length})
          </h2>

          {pending.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No hay skills pendientes.</p>
          ) : (
            <div className="space-y-3 mb-12">
              {pending.map(skill => (
                <div key={skill.id} className="p-5 rounded-2xl bg-secondary flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{skill.display_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{skill.tagline}</p>
                    {skill.github_url && (
                      <a href={skill.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline">
                        GitHub
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(skill.id, "approved")}
                      className="p-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction(skill.id, "rejected")}
                      className="p-2.5 rounded-xl bg-background text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Skills */}
          <h2 className="text-xl font-semibold mb-4">Todas las skills ({skills.length})</h2>
          <div className="space-y-2">
            {skills.map(skill => (
              <div key={skill.id} className="p-4 rounded-xl bg-secondary flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{skill.display_name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{skill.install_count} installs</span>
                  <span className="text-muted-foreground">⭐ {Number(skill.avg_rating).toFixed(1)}</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    skill.status === "approved" ? "bg-foreground/10 text-foreground" :
                    skill.status === "pending" ? "bg-accent text-muted-foreground" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {skill.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
