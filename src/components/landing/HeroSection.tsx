import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentLogoStrip } from "@/components/AgentLogos";

const chatMessages = [
  { role: "user" as const, text: "Necesito un análisis competitivo para el board de mañana", delay: 0 },
  { role: "assistant" as const, text: "Analizando 12 competidores… pricing, features y gaps detectados. Reporte listo en formato ejecutivo.", delay: 1800 },
  { role: "user" as const, text: "Revisá este contrato antes de firmar", delay: 4200 },
  { role: "assistant" as const, text: "14 cláusulas revisadas. 3 riesgos altos identificados con sugerencias de modificación.", delay: 5800 },
];

const ChatDemo = () => {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setVisibleMessages(0);
    const timers = chatMessages.map((msg, i) =>
      setTimeout(() => setVisibleMessages(i + 1), msg.delay)
    );
    const loopTimer = setTimeout(() => setCycle((c) => c + 1), 9000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(loopTimer);
    };
  }, [cycle]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="max-w-lg mx-auto mt-12"
    >
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
          <span className="ml-2 text-xs text-muted-foreground font-medium">Asistente AI</span>
        </div>
        <div className="p-5 space-y-3 min-h-[180px]">
          {chatMessages.slice(0, visibleMessages).map((msg, i) => (
            <motion.div
              key={`${cycle}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          {visibleMessages < chatMessages.length && (
            <div className="flex justify-start">
              <div className="flex gap-1 px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border">
            <span className="text-sm text-muted-foreground flex-1">Pedí lo que necesites...</span>
            <Send className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
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

          {/* Agent logo strip */}
          <div className="mt-10">
            <p className="text-xs text-muted-foreground mb-3">{t("landing.multiAgentBadge")}</p>
            <AgentLogoStrip />
          </div>
        </motion.div>

        <ChatDemo />
      </div>
    </section>
  );
};

export default HeroSection;
