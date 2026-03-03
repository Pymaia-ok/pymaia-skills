import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllSkills, updateSkillStatus, checkIsAdmin } from "@/lib/api";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

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
