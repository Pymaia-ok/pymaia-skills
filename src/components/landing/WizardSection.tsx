import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import RoleCard from "@/components/RoleCard";
import SkillCard from "@/components/SkillCard";
import { Button } from "@/components/ui/button";
import type { SkillFromDB } from "@/lib/api";

/* ─── Roles ─── */
const roleIds = [
  "marketer", "ventas", "consultor", "founder",
  "abogado", "product-manager", "disenador", "ingeniero",
  "data-analyst", "devops", "medico", "profesor", "rrhh", "otro",
] as const;

const roleIcons: Record<string, string> = {
  marketer: "📣", ventas: "💰", consultor: "💼", founder: "🚀",
  abogado: "⚖️", "product-manager": "🗺️", disenador: "🎨", ingeniero: "🔧",
  "data-analyst": "📊", devops: "⚙️", medico: "🏥", profesor: "👨‍🏫",
  rrhh: "👥", otro: "✨",
};

/* ─── Tasks per role ─── */
const taskIdsByRole: Record<string, string[]> = {
  marketer: ["contenido", "seo", "email", "social"],
  ventas: ["prospeccion", "crm", "outreach", "pricing"],
  consultor: ["propuestas", "investigacion", "presentaciones", "analisis"],
  founder: ["producto", "pitch", "competencia", "metricas"],
  abogado: ["contratos", "documentos", "compliance", "jurisprudencia"],
  "product-manager": ["roadmap", "userstories", "sprints", "stakeholders"],
  disenador: ["briefs", "designsystem", "prototipos", "specs"],
  ingeniero: ["pipelines", "sqlopt", "calidad", "dataanalisis"],
  "data-analyst": ["sqlquery", "visualizacion", "limpieza", "modelado"],
  devops: ["deploy", "containers", "infra", "monitoring"],
  medico: ["historias", "diagnostico", "papers", "recetas"],
  profesor: ["clases", "evaluaciones", "material", "retroalimentacion"],
  rrhh: ["reclutamiento", "onboarding", "evaluacionrrhh", "cultura"],
  otro: ["productividad", "escritura", "datos", "automatizar"],
};

/* ─── Task → filtering logic ─── */
const taskFilters: Record<string, { categories: string[]; industries: string[]; keywords: string[] }> = {
  // Marketer
  contenido: { categories: ["marketing", "creatividad"], industries: ["contenido", "marketing", "redes-sociales"], keywords: ["content", "copy", "write", "blog", "social", "post"] },
  seo: { categories: ["marketing", "datos"], industries: ["seo", "marketing", "contenido"], keywords: ["seo", "keyword", "rank", "search", "organic", "meta", "serp"] },
  email: { categories: ["marketing", "automatización"], industries: ["email", "marketing"], keywords: ["email", "newsletter", "campaign", "mailchimp", "drip", "automat"] },
  social: { categories: ["marketing", "creatividad"], industries: ["redes-sociales", "marketing", "contenido"], keywords: ["social", "instagram", "linkedin", "twitter", "tiktok", "post", "schedule"] },
  // Ventas
  prospeccion: { categories: ["ventas", "marketing"], industries: ["ventas", "negocios"], keywords: ["prospect", "lead", "pipeline", "sales", "outbound", "cold"] },
  crm: { categories: ["ventas", "negocios"], industries: ["ventas", "negocios"], keywords: ["crm", "salesforce", "hubspot", "zoho", "deal", "pipeline", "contact"] },
  outreach: { categories: ["ventas", "marketing"], industries: ["ventas", "email"], keywords: ["cold", "email", "outreach", "sequence", "follow-up", "reply"] },
  pricing: { categories: ["ventas", "negocios"], industries: ["ventas", "estrategia", "finanzas"], keywords: ["price", "pricing", "revenue", "margin", "discount", "model"] },
  // Consultor
  propuestas: { categories: ["negocios", "productividad"], industries: ["estrategia", "negocios", "documentos"], keywords: ["proposal", "propuesta", "pitch", "strategy", "consulting"] },
  investigacion: { categories: ["datos", "negocios"], industries: ["estrategia", "datos", "negocios"], keywords: ["research", "market", "analysis", "competitor", "trend", "industry"] },
  presentaciones: { categories: ["negocios", "creatividad", "productividad"], industries: ["presentaciones", "estrategia"], keywords: ["presentation", "slide", "deck", "pitch", "pptx", "powerpoint"] },
  analisis: { categories: ["datos"], industries: ["datos", "estrategia", "finanzas"], keywords: ["data", "analysis", "excel", "sql", "chart", "dashboard", "xlsx"] },
  // Founder
  producto: { categories: ["desarrollo", "producto", "negocios"], industries: ["tecnologia", "producto"], keywords: ["product", "feature", "mvp", "build", "ship", "saas"] },
  pitch: { categories: ["negocios"], industries: ["negocios", "estrategia", "finanzas", "presentaciones"], keywords: ["pitch", "investor", "fundrais", "deck", "startup", "pptx"] },
  competencia: { categories: ["negocios", "datos"], industries: ["estrategia", "negocios"], keywords: ["competitor", "market", "research", "benchmark", "comparison"] },
  metricas: { categories: ["datos", "negocios"], industries: ["datos", "finanzas", "negocios"], keywords: ["metric", "kpi", "analytics", "track", "dashboard", "chart"] },
  // Abogado
  contratos: { categories: ["legal"], industries: ["legal", "documentos"], keywords: ["contract", "legal", "agreement", "clause", "review", "docx"] },
  documentos: { categories: ["legal", "productividad"], industries: ["legal", "documentos"], keywords: ["document", "legal", "draft", "write", "docx", "pdf"] },
  compliance: { categories: ["legal"], industries: ["legal", "seguridad"], keywords: ["compliance", "gdpr", "regulat", "audit", "policy", "privacy"] },
  jurisprudencia: { categories: ["legal"], industries: ["legal"], keywords: ["legal", "law", "research", "case", "jurisprudencia", "court"] },
  // Product Manager
  roadmap: { categories: ["producto", "negocios"], industries: ["tecnologia", "producto"], keywords: ["roadmap", "plan", "priorit", "backlog", "quarter", "strategy"] },
  userstories: { categories: ["producto"], industries: ["tecnologia", "producto"], keywords: ["user story", "story", "acceptance", "requirement", "spec", "criteria"] },
  sprints: { categories: ["producto", "productividad"], industries: ["tecnologia", "producto"], keywords: ["sprint", "agile", "scrum", "standup", "retro", "jira", "kanban"] },
  stakeholders: { categories: ["producto", "negocios"], industries: ["tecnologia", "producto", "estrategia"], keywords: ["stakeholder", "feedback", "alignment", "review", "decision"] },
  // Diseñador
  briefs: { categories: ["diseño", "creatividad"], industries: ["diseno", "creatividad"], keywords: ["brief", "creative", "design", "concept", "moodboard"] },
  designsystem: { categories: ["diseño", "desarrollo"], industries: ["diseno", "frontend"], keywords: ["design system", "component", "token", "figma", "ui", "style guide"] },
  prototipos: { categories: ["diseño"], industries: ["diseno", "ux", "frontend"], keywords: ["prototype", "wireframe", "mockup", "figma", "flow", "interaction"] },
  specs: { categories: ["diseño", "desarrollo"], industries: ["diseno", "frontend", "ux"], keywords: ["spec", "handoff", "css", "responsive", "layout", "component"] },
  // Data Engineer
  pipelines: { categories: ["datos", "desarrollo"], industries: ["datos", "tecnologia"], keywords: ["pipeline", "etl", "data", "ingest", "stream", "batch", "airflow"] },
  sqlopt: { categories: ["datos", "desarrollo"], industries: ["datos", "tecnologia"], keywords: ["sql", "query", "optim", "postgres", "database", "index", "perf"] },
  calidad: { categories: ["datos"], industries: ["datos"], keywords: ["quality", "validat", "test", "monitor", "anomal", "data quality", "schema"] },
  dataanalisis: { categories: ["datos"], industries: ["datos", "tecnologia"], keywords: ["analys", "statistic", "metric", "report", "dashboard", "notebook"] },
  // Data Analyst
  sqlquery: { categories: ["datos", "desarrollo"], industries: ["datos", "finanzas"], keywords: ["sql", "query", "database", "postgres", "bigquery", "redshift"] },
  visualizacion: { categories: ["datos", "diseño"], industries: ["datos"], keywords: ["chart", "dashboard", "visual", "grafana", "power bi", "tableau", "report"] },
  limpieza: { categories: ["datos"], industries: ["datos"], keywords: ["clean", "transform", "etl", "dbt", "quality", "pipeline", "csv", "xlsx"] },
  modelado: { categories: ["datos", "ia"], industries: ["datos"], keywords: ["model", "predict", "regression", "machine learn", "scikit", "statist", "forecast"] },
  // DevOps
  deploy: { categories: ["desarrollo", "operaciones"], industries: ["tecnologia", "operaciones"], keywords: ["deploy", "ci", "cd", "pipeline", "release", "github actions"] },
  containers: { categories: ["desarrollo", "operaciones"], industries: ["tecnologia", "operaciones"], keywords: ["docker", "container", "kubernetes", "k8s", "image", "helm"] },
  infra: { categories: ["operaciones", "desarrollo"], industries: ["tecnologia", "operaciones"], keywords: ["terraform", "infra", "aws", "azure", "gcp", "cloud", "serverless"] },
  monitoring: { categories: ["operaciones", "datos"], industries: ["tecnologia", "operaciones"], keywords: ["monitor", "alert", "log", "metric", "observ", "grafana", "datadog"] },
  // Médico
  historias: { categories: ["productividad", "salud"], industries: ["medicina"], keywords: ["clinic", "patient", "history", "medical", "record", "historia", "clinical"] },
  diagnostico: { categories: ["ia", "salud"], industries: ["medicina"], keywords: ["diagnos", "symptom", "disease", "clinical", "differential", "patient"] },
  papers: { categories: ["datos", "productividad"], industries: ["medicina", "educación"], keywords: ["paper", "research", "pubmed", "study", "journal", "systematic"] },
  recetas: { categories: ["productividad", "salud"], industries: ["medicina"], keywords: ["prescri", "receta", "medication", "drug", "pharma", "dosage"] },
  // Profesor
  clases: { categories: ["productividad", "creatividad", "educación"], industries: ["educación"], keywords: ["lesson", "plan", "curriculum", "class", "teach", "clase", "course"] },
  evaluaciones: { categories: ["productividad", "educación"], industries: ["educación"], keywords: ["exam", "test", "quiz", "rubric", "evalua", "grade", "assessment"] },
  material: { categories: ["creatividad", "productividad", "educación"], industries: ["educación"], keywords: ["material", "didact", "resource", "content", "exercise", "worksheet"] },
  retroalimentacion: { categories: ["productividad", "educación"], industries: ["educación"], keywords: ["feedback", "student", "comment", "review", "grade", "progress"] },
  // RRHH
  reclutamiento: { categories: ["rrhh", "productividad"], industries: ["rrhh"], keywords: ["recruit", "hire", "candidate", "resume", "interview", "talent", "screen"] },
  onboarding: { categories: ["rrhh", "productividad"], industries: ["rrhh"], keywords: ["onboard", "train", "orient", "welcome", "handbook", "checklist"] },
  evaluacionrrhh: { categories: ["rrhh", "productividad"], industries: ["rrhh"], keywords: ["performance", "review", "feedback", "goal", "evaluat", "1on1", "okr"] },
  cultura: { categories: ["rrhh"], industries: ["rrhh"], keywords: ["culture", "engag", "survey", "retention", "wellness", "team", "eNPS"] },
  // Otro
  productividad: { categories: ["productividad", "automatización"], industries: ["productividad", "automatizacion"], keywords: ["productiv", "automat", "workflow", "efficien", "notion", "trello"] },
  escritura: { categories: ["productividad", "creatividad"], industries: ["contenido", "documentos"], keywords: ["write", "edit", "grammar", "text", "document", "docx", "pdf"] },
  datos: { categories: ["datos"], industries: ["datos"], keywords: ["data", "excel", "csv", "sql", "analysis", "chart", "xlsx", "spreadsheet"] },
  automatizar: { categories: ["automatización"], industries: ["automatizacion"], keywords: ["automat", "workflow", "scrape", "bot", "schedule", "cron", "browser"] },
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

  const recommendedSkills = (() => {
    const filter = taskFilters[selectedTask];
    if (!filter) return [];

    const scored = allSkills
      .filter((s) => s.status === "approved")
      .map((s) => {
        let score = 0;
        if (s.target_roles.includes(selectedRole)) score += 2;
        if (filter.categories.includes(s.category)) score += 3;
        const industryMatches = s.industry.filter((ind) => filter.industries.includes(ind)).length;
        score += industryMatches * 2;
        const text = `${s.display_name} ${s.tagline} ${s.tagline_es || ""} ${s.description_human}`.toLowerCase();
        const keywordMatches = filter.keywords.filter((kw) => text.includes(kw)).length;
        score += keywordMatches;
        return { skill: s, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.skill);

    return scored;
  })();

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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              {selectedRole && (
                <div className="text-center mt-8">
                  <Button asChild variant="outline" size="lg" className="rounded-full gap-2">
                    <Link to={`/para/${selectedRole}`}>
                      {t("roleLanding.viewPack")} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
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
