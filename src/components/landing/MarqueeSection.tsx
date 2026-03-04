import { motion } from "framer-motion";

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
  "Propuesta de consultoría",
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
    {/* Fade edges */}
    <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
    <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />
    <motion.div
      className="flex gap-4 w-max"
      animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {children}
      {children}
    </motion.div>
  </div>
);

const MarqueeSection = () => {
  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <h2 className="section-title mb-4">Skills para cada profesión</h2>
          <p className="text-muted-foreground text-lg">
            No importa a qué te dediques. Hay una skill que transforma tu trabajo.
          </p>
        </motion.div>
      </div>

      {/* Roles marquee */}
      <div className="mb-6">
        <MarqueeStrip duration={35}>
          {roles.map((role) => (
            <div
              key={role.label}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-border bg-card whitespace-nowrap select-none"
            >
              <span className="text-2xl">{role.emoji}</span>
              <span className="text-base font-semibold text-foreground">{role.label}</span>
            </div>
          ))}
        </MarqueeStrip>
      </div>

      {/* Skills marquee (reverse direction) */}
      <MarqueeStrip reverse duration={45}>
        {skills.map((skill) => (
          <div
            key={skill}
            className="px-6 py-4 rounded-2xl bg-foreground text-background whitespace-nowrap select-none font-medium text-base"
          >
            {skill}
          </div>
        ))}
      </MarqueeStrip>
    </section>
  );
};

export default MarqueeSection;
