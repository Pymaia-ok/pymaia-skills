import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";

const steps = [
  {
    title: "¿Qué es Claude Code?",
    description: "Claude Code es la versión de escritorio de Claude que puede interactuar con tus archivos. Es como tener un asistente experto que entiende tu trabajo y puede ejecutar tareas por vos.",
  },
  {
    title: "Descargá Claude Code",
    description: "Andá a claude.ai/code y descargá la app para tu sistema operativo. La instalación tarda menos de 2 minutos.",
  },
  {
    title: "Abrí Claude Code e iniciá sesión",
    description: "Una vez instalado, abrí la app e iniciá sesión con tu cuenta de Claude. Si no tenés una, podés crearla gratis.",
  },
  {
    title: "Instalá tu primera skill",
    description: "Volvé a SkillHub, elegí una skill que te sirva y seguí la guía de instalación. En 2 minutos tu Claude va a saber hacer cosas que antes no podía.",
  },
];

const PrimerosePasos = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-14 max-w-3xl mx-auto px-6 py-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <h1 className="section-title mb-4">Primeros pasos</h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          De cero a tu primera skill instalada en menos de 10 minutos. Sin conocimiento técnico.
        </p>
      </motion.div>

      <div className="space-y-8">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-6"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-base font-semibold">
              {i + 1}
            </div>
            <div className="flex-1 pb-8 border-b border-border last:border-0">
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-16 text-center"
      >
        <Link
          to="/explorar"
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Explorar skills
        </Link>
      </motion.div>
    </div>
  </div>
);

export default PrimerosePasos;
