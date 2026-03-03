import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ArrowLeft, Copy, Check, Clock, Download } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { getSkillBySlug } from "@/data/skills";

const SkillDetail = () => {
  const { slug } = useParams();
  const skill = getSkillBySlug(slug || "");
  const [copied, setCopied] = useState(false);

  if (!skill) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="section-title mb-4">Skill no encontrada</h1>
          <Link to="/explorar" className="text-muted-foreground hover:text-foreground">
            ← Volver al directorio
          </Link>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(skill.installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installSteps = [
    {
      title: "¿Qué es una skill?",
      description: "Una skill es un archivo que le enseña a Claude cómo hacer una tarea específica de tu trabajo. No es una app ni un plugin — es conocimiento experto que Claude usa automáticamente.",
    },
    {
      title: "Abrí Claude Code en tu computadora",
      description: "Si todavía no tenés Claude Code, andá a nuestra guía de primeros pasos para instalarlo en 5 minutos.",
    },
    {
      title: "Copiá y pegá este comando",
      description: "En la ventana de Claude Code, pegá el siguiente comando y presioná Enter.",
      command: skill.installCommand,
    },
    {
      title: "¡Listo! Ya podés usarla",
      description: `Claude ahora sabe cómo ${skill.tagline.toLowerCase()}. Simplemente pedile que haga la tarea y va a usar la skill automáticamente.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        {/* Hero section */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Directorio
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              {skill.industry.map((ind) => (
                <span key={ind} className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {ind}
                </span>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {skill.displayName}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
              {skill.tagline}
            </p>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-foreground text-foreground" />
                <span className="font-medium text-foreground">{skill.avgRating}</span>
                <span>({skill.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                <span>{skill.installCount.toLocaleString()} instalaciones</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{skill.timeToInstallMinutes} min para instalar</span>
              </div>
            </div>
          </motion.div>

          {/* About this skill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-semibold mb-6">Qué hace esta skill</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              {skill.descriptionHuman}
            </p>

            <h3 className="text-lg font-semibold mb-4">Casos de uso</h3>
            <div className="grid gap-3">
              {skill.useCases.map((uc) => (
                <div key={uc.title} className="p-5 rounded-2xl bg-secondary">
                  <h4 className="font-semibold mb-1">{uc.title}</h4>
                  <p className="text-sm text-muted-foreground">{uc.after}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-20"
          >
            <h2 className="text-2xl font-semibold mb-8">Lo que dicen los usuarios</h2>
            <div className="grid gap-4">
              {skill.reviews.map((review) => (
                <div key={review.author} className="p-6 rounded-2xl bg-secondary">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-foreground text-foreground" />
                    ))}
                  </div>
                  <p className="text-base mb-4 leading-relaxed">"{review.comment}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{review.author}</p>
                      <p className="text-xs text-muted-foreground">{review.role}</p>
                    </div>
                    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-background text-muted-foreground">
                      Ahorra {review.timeSaved}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Installation Guide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="border-t border-border pt-16">
              <h2 className="text-2xl font-semibold mb-2">Guía de instalación</h2>
              <p className="text-muted-foreground mb-10">
                Paso a paso, sin terminal. En {skill.timeToInstallMinutes} minutos la tenés funcionando.
              </p>

              <div className="space-y-6">
                {installSteps.map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">
                      {i + 1}
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      {step.command && (
                        <div className="flex items-center gap-2 p-4 rounded-xl bg-foreground text-background font-mono text-sm">
                          <code className="flex-1">{step.command}</code>
                          <button
                            onClick={handleCopy}
                            className="p-2 rounded-lg hover:bg-background/10 transition-colors"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-6 rounded-2xl bg-secondary text-center">
                <p className="text-sm text-muted-foreground mb-2">¿Te trabaste?</p>
                <Link
                  to="/primeros-pasos"
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  Leé nuestra guía completa de primeros pasos →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SkillDetail;
