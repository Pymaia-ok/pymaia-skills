import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const roles = [
  { emoji: "📣", label: "Marketing" },
  { emoji: "⚖️", label: "Legal" },
  { emoji: "💰", label: "Finanzas" },
  { emoji: "🚀", label: "Startups" },
  { emoji: "🎨", label: "Diseño" },
  { emoji: "💼", label: "Consultoría" },
  { emoji: "📊", label: "Datos" },
  { emoji: "🏥", label: "Salud" },
  { emoji: "🎓", label: "Educación" },
  { emoji: "🏗️", label: "Arquitectura" },
  { emoji: "🔧", label: "Ingeniería" },
  { emoji: "🏠", label: "Construcción" },
  { emoji: "🩺", label: "Medicina" },
  { emoji: "📝", label: "Contenido" },
  { emoji: "🛒", label: "E-commerce" },
];

const skills = [
  "Estrategia de contenidos",
  "Brief para influencers",
  "Revisión de contratos",
  "Presentación comercial",
  "Análisis competitivo",
  "Email marketing",
  "Pitch deck",
  "SEO técnico",
  "Auditoría legal",
  "Plan de negocios",
  "Dashboard de métricas",
  "Planos CAD",
  "Revisión BIM",
  "Historia clínica",
  "Plan de obra",
  "Cálculo estructural",
  "Planificación de clases",
];

const MarqueeStrip = ({
  children,
  reverse = false,
  duration = 40,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  duration?: number;
}) => (
  <div className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
    <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />
    <motion.div
      className="flex gap-3 w-max"
      animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {children}
      {children}
    </motion.div>
  </div>
);

const MarqueeSection = () => {
  const { t } = useTranslation();

  return (
    <section className="pt-4 pb-16 overflow-hidden">
      {/* Roles marquee */}
      <div className="mb-4">
        <MarqueeStrip duration={35}>
          {roles.map((role) => (
            <div
              key={role.label}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card whitespace-nowrap select-none"
            >
              <span className="text-xl">{role.emoji}</span>
              <span className="text-sm font-semibold text-foreground">{role.label}</span>
            </div>
          ))}
        </MarqueeStrip>
      </div>

      {/* Skills marquee (reverse direction) */}
      <div className="mb-12">
        <MarqueeStrip reverse duration={45}>
          {skills.map((skill) => (
            <div
              key={skill}
              className="px-5 py-3 rounded-xl bg-foreground text-background whitespace-nowrap select-none font-medium text-sm"
            >
              {skill}
            </div>
          ))}
        </MarqueeStrip>
      </div>

      {/* Title below the marquees */}
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <h2 className="section-title mb-4">{t("landing.marqueeTitle")}</h2>
          <p className="text-muted-foreground text-lg">
            {t("landing.marqueeSubtitle")}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default MarqueeSection;
