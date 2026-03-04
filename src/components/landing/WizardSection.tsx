import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import RoleCard from "@/components/RoleCard";
import SkillCard from "@/components/SkillCard";
import type { SkillFromDB } from "@/lib/api";

const roleIds = ["marketer", "abogado", "consultor", "founder", "disenador", "otro"] as const;
const roleIcons: Record<string, string> = {
  marketer: "📣", abogado: "⚖️", consultor: "💼", founder: "🚀", disenador: "🎨", otro: "✨",
};
const taskIdsByRole: Record<string, string[]> = {
  marketer: ["contenido", "analizar", "clientes", "reportes"],
  abogado: ["contratos", "documentos", "jurisprudencia", "compliance"],
  consultor: ["propuestas", "investigacion", "presentaciones", "analisis"],
  founder: ["producto", "pitch", "competencia", "metricas"],
  disenador: ["briefs", "copy", "feedback", "specs"],
  otro: ["productividad", "escritura", "datos", "automatizar"],
};

interface WizardSectionProps {
  allSkills: SkillFromDB[];
}

const WizardSection = ({ allSkills }: WizardSectionProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<"role" | "task" | "results">("role");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTask, setSelectedTask] = useState("");

  const handleRoleSelect = (roleId: string) => { setSelectedRole(roleId); setStep("task"); };
  const handleTaskSelect = (taskId: string) => { setSelectedTask(taskId); setStep("results"); };
  const handleBack = () => {
    if (step === "task") { setStep("role"); setSelectedRole(""); }
    else if (step === "results") { setStep("task"); setSelectedTask(""); }
  };

  const recommendedSkills = allSkills
    .filter((s) => s.target_roles.includes(selectedRole))
    .sort((a, b) => Number(b.avg_rating) - Number(a.avg_rating))
    .slice(0, 5);

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <h2 className="section-title mb-4">{t("landing.wizardTitle")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.wizardSubtitle")}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "role" && (
            <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">{t("home.whatDoYouDo")}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {roleIds.map((id) => (
                  <RoleCard key={id} icon={roleIcons[id]} label={t(`roles.${id}.label`)} description={t(`roles.${id}.description`)} onClick={() => handleRoleSelect(id)} />
                ))}
              </div>
            </motion.div>
          )}

          {step === "task" && (
            <motion.div key="task" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
                <ArrowLeft className="w-4 h-4" /> {t("home.back")}
              </button>
              <div className="text-center mb-10">
                <p className="text-sm text-muted-foreground mb-3">{roleIcons[selectedRole]} {t(`roles.${selectedRole}.label`)}</p>
                <h3 className="text-2xl font-semibold mb-2">{t("home.whatBetter")}</h3>
                <p className="text-muted-foreground">{t("home.choosTask")}</p>
              </div>
              <div className="grid gap-3">
                {taskIdsByRole[selectedRole]?.map((taskId) => (
                  <motion.button key={taskId} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => handleTaskSelect(taskId)} className="w-full text-left p-5 rounded-2xl bg-background hover:bg-accent transition-colors text-lg font-medium border border-border">
                    {t(`tasks.${selectedRole}.${taskId}`)}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "results" && (
            <motion.div key="results" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
                <ArrowLeft className="w-4 h-4" /> {t("home.back")}
              </button>
              <div className="text-center mb-10">
                <h3 className="text-2xl font-semibold mb-2">{t("home.recommended")}</h3>
                <p className="text-muted-foreground">{t("home.recommendedSub")}</p>
              </div>
              {recommendedSkills.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendedSkills.map((skill, i) => (
                    <SkillCard key={skill.id} skill={skill} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">{t("home.noSkills")}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t("home.tryAnother")}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default WizardSection;
