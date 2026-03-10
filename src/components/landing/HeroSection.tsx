import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const terminalLines = [
  { text: "$ claude", delay: 0 },
  { text: '> Instalá la skill "Contract Reviewer"', delay: 800 },
  { text: "✓ Skill instalada correctamente", delay: 2200 },
  { text: '> Revisá este contrato de servicios', delay: 3400 },
  { text: "⚡ Analizando cláusulas… 12 riesgos detectados", delay: 4800 },
];

const TerminalDemo = () => {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers = terminalLines.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay)
    );
    const loopTimer = setTimeout(() => setVisibleLines(0), 8000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(loopTimer);
    };
  }, [visibleLines]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="max-w-lg mx-auto mt-12"
    >
      <div className="rounded-2xl border border-border bg-foreground text-background overflow-hidden shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
          <div className="w-3 h-3 rounded-full bg-background/20" />
          <div className="w-3 h-3 rounded-full bg-background/20" />
          <div className="w-3 h-3 rounded-full bg-background/20" />
          <span className="ml-2 text-xs text-background/40 font-mono">Terminal</span>
        </div>
        {/* Terminal body */}
        <div className="p-5 font-mono text-sm space-y-2 min-h-[160px]">
          {terminalLines.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={
                line.text.startsWith("✓")
                  ? "text-green-400"
                  : line.text.startsWith("⚡")
                    ? "text-yellow-300"
                    : line.text.startsWith("$")
                      ? "text-background/60"
                      : "text-background/90"
              }
            >
              {line.text}
            </motion.div>
          ))}
          {visibleLines < terminalLines.length && (
            <span className="inline-block w-2 h-4 bg-background/60 animate-pulse" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground mb-8 border border-border">
            <Zap className="w-4 h-4" />
            {t("landing.heroBadge")}
          </div>

          <h1 className="hero-title mb-6 whitespace-pre-line">
            {t("landing.heroTitle")}
          </h1>

          <p className="hero-subtitle max-w-2xl mx-auto mb-10">
            {t("landing.heroSubtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base px-8 h-12 rounded-full">
              <Link to="/explorar">
                {t("landing.heroCtaExplore")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8 h-12 rounded-full">
              <Link to="/primeros-pasos">
                {t("landing.heroCtaLearn")}
              </Link>
            </Button>
          </div>
        </motion.div>

        <TerminalDemo />
      </div>
    </section>
  );
};

export default HeroSection;
