import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import RoleCard from "@/components/RoleCard";
import SkillCard from "@/components/SkillCard";
import { fetchSkills, type SkillFromDB } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

const roles = [
  { id: "marketer", label: "Marketer", icon: "📣", description: "Marketing y contenido" },
  { id: "abogado", label: "Abogado", icon: "⚖️", description: "Legal y contratos" },
  { id: "consultor", label: "Consultor", icon: "💼", description: "Consultoría y estrategia" },
  { id: "founder", label: "Founder", icon: "🚀", description: "Startups y producto" },
  { id: "disenador", label: "Diseñador", icon: "🎨", description: "Diseño y creatividad" },
  { id: "otro", label: "Otro", icon: "✨", description: "Cualquier profesión" },
];

const tasksByRole: Record<string, { id: string; label: string }[]> = {
  marketer: [
    { id: "contenido", label: "Crear contenido más rápido" },
    { id: "analizar", label: "Analizar resultados y métricas" },
    { id: "clientes", label: "Gestionar clientes" },
    { id: "reportes", label: "Preparar reportes" },
  ],
  abogado: [
    { id: "contratos", label: "Revisar contratos" },
    { id: "documentos", label: "Redactar documentos legales" },
    { id: "jurisprudencia", label: "Investigar jurisprudencia" },
    { id: "compliance", label: "Verificar compliance" },
  ],
  consultor: [
    { id: "propuestas", label: "Preparar propuestas" },
    { id: "investigacion", label: "Investigar mercados" },
    { id: "presentaciones", label: "Crear presentaciones" },
    { id: "analisis", label: "Análisis de datos" },
  ],
  founder: [
    { id: "producto", label: "Definir producto y features" },
    { id: "pitch", label: "Preparar pitch decks" },
    { id: "competencia", label: "Analizar competencia" },
    { id: "metricas", label: "Trackear métricas clave" },
  ],
  disenador: [
    { id: "briefs", label: "Generar briefs creativos" },
    { id: "copy", label: "Escribir copy para diseños" },
    { id: "feedback", label: "Estructurar feedback" },
    { id: "specs", label: "Documentar specs de diseño" },
  ],
  otro: [
    { id: "productividad", label: "Ser más productivo" },
    { id: "escritura", label: "Escribir mejor y más rápido" },
    { id: "datos", label: "Analizar datos sin Excel" },
    { id: "automatizar", label: "Automatizar tareas repetitivas" },
  ],
};

const Index = () => {
  const [step, setStep] = useState<"role" | "task" | "results">("role");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTask, setSelectedTask] = useState("");

  const { data: skillsResult } = useQuery({
    queryKey: ["skills-all"],
    queryFn: () => fetchSkills({ sortBy: "rating" }),
  });
  const allSkills = skillsResult?.data ?? [];

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setStep("task");
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTask(taskId);
    setStep("results");
  };

  const handleBack = () => {
    if (step === "task") { setStep("role"); setSelectedRole(""); }
    else if (step === "results") { setStep("task"); setSelectedTask(""); }
  };

  const recommendedSkills = allSkills
    .filter((s) => s.target_roles.includes(selectedRole))
    .sort((a, b) => Number(b.avg_rating) - Number(a.avg_rating))
    .slice(0, 5);

  const selectedRoleData = roles.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <AnimatePresence mode="wait">
          {step === "role" && (
            <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto px-6 py-24">
              <div className="text-center mb-16">
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hero-title mb-6">
                  Potenciá Claude<br />para tu trabajo.
                </motion.h1>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="hero-subtitle max-w-xl mx-auto">
                  Sin terminal. Sin código. Solo elegí lo que querés hacer mejor y en 2 minutos tu IA lo sabe hacer.
                </motion.p>
              </div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">¿En qué trabajás?</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <RoleCard key={role.id} icon={role.icon} label={role.label} description={role.description} onClick={() => handleRoleSelect(role.id)} />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === "task" && (
            <motion.div key="task" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-3xl mx-auto px-6 py-24">
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <div className="text-center mb-16">
                <p className="text-sm text-muted-foreground mb-3">{selectedRoleData?.icon} {selectedRoleData?.label}</p>
                <h2 className="section-title mb-4">¿Qué querés hacer mejor?</h2>
                <p className="text-muted-foreground">Elegí la tarea más urgente y te recomendamos las mejores skills.</p>
              </div>
              <div className="grid gap-3">
                {tasksByRole[selectedRole]?.map((task) => (
                  <motion.button key={task.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => handleTaskSelect(task.id)} className="w-full text-left p-5 rounded-2xl bg-secondary hover:bg-accent transition-colors text-lg font-medium">
                    {task.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "results" && (
            <motion.div key="results" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-4xl mx-auto px-6 py-24">
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <div className="text-center mb-12">
                <h2 className="section-title mb-4">Skills recomendadas para vos</h2>
                <p className="text-muted-foreground">Basado en tu rol y tarea, estas son las que más te van a servir.</p>
              </div>
              {recommendedSkills.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendedSkills.map((skill, i) => (
                    <SkillCard key={skill.id} skill={skill} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">Todavía no tenemos skills para esta combinación.</p>
                  <p className="text-sm text-muted-foreground mt-2">Probá otra tarea o explorá el directorio completo.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
