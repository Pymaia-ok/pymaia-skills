import { useEffect } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, Plug, Puzzle, Newspaper, Rocket } from "lucide-react";

const LINKS = [
  {
    label: "Cursos",
    description: "Aprende a usar IA como un profesional",
    href: "/cursos",
    icon: GraduationCap,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    label: "Skills",
    description: "Explora 49,000+ habilidades para agentes IA",
    href: "/explorar",
    icon: Sparkles,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    label: "Conectores",
    description: "Integra tus herramientas favoritas",
    href: "/conectores",
    icon: Plug,
    gradient: "from-emerald-500 to-green-600",
  },
  {
    label: "Plugins",
    description: "Extensiones para potenciar tu agente",
    href: "/plugins",
    icon: Puzzle,
    gradient: "from-sky-500 to-blue-600",
  },
  {
    label: "Novedades",
    description: "Las últimas noticias y artículos",
    href: "/blog",
    icon: Newspaper,
    gradient: "from-rose-500 to-pink-600",
  },
  {
    label: "Landing",
    description: "Conocé Pymaia desde el inicio",
    href: "/",
    icon: Rocket,
    gradient: "from-neutral-600 to-neutral-800 dark:from-neutral-300 dark:to-neutral-100",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function Links() {
  useEffect(() => {
    document.title = "Pymaia — Links";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 pt-16 pb-24 sm:pt-24">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8">
        {/* Avatar / Brand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <img
              src="/images/pymaia-skills-icon.png"
              alt="Pymaia"
              className="w-12 h-12 object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Pymaia Skills</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              El directorio de skills para agentes IA más completo
            </p>
          </div>
        </motion.div>

        {/* Links */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full flex flex-col gap-3"
        >
          {LINKS.map((link) => (
            <motion.a
              key={link.href}
              href={link.href}
              variants={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-4 transition-shadow hover:shadow-lg hover:border-primary/20 active:shadow-md"
            >
              <div
                className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center shadow-sm`}
              >
                <link.icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="block text-[15px] font-semibold text-foreground leading-tight">
                  {link.label}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                  {link.description}
                </span>
              </div>
              <svg
                className="ml-auto shrink-0 w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </motion.a>
          ))}
        </motion.div>

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground/60 tracking-wide">
          pymaiaskills.lovable.app
        </p>
      </div>
    </div>
  );
}
