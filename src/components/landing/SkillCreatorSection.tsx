import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Globe, Lock, Play } from "lucide-react";

const chatLines = [
  { role: "ai", text: "¿Qué expertise querés empaquetar?" },
  { role: "user", text: "Soy abogado, reviso contratos todos los días" },
  { role: "ai", text: "Perfecto. Tu skill analizará cláusulas de riesgo…" },
];

const features = [
  {
    icon: MessageSquare,
    titleKey: "landing.creatorFeature1Title",
    descKey: "landing.creatorFeature1Desc",
  },
  {
    icon: Globe,
    secondIcon: Lock,
    titleKey: "landing.creatorFeature2Title",
    descKey: "landing.creatorFeature2Desc",
  },
  {
    icon: Play,
    titleKey: "landing.creatorFeature3Title",
    descKey: "landing.creatorFeature3Desc",
  },
];

const SkillCreatorSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-4">{t("landing.creatorTitle")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("landing.creatorSubtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10 items-center mb-14">
          {/* Mini chat mockup */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-foreground text-background overflow-hidden shadow-xl"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
              <div className="w-3 h-3 rounded-full bg-background/20" />
              <div className="w-3 h-3 rounded-full bg-background/20" />
              <div className="w-3 h-3 rounded-full bg-background/20" />
              <span className="ml-2 text-xs text-background/40 font-mono">SkillForge</span>
            </div>
            <div className="p-5 space-y-3 min-h-[140px]">
              {chatLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className={`text-sm font-mono ${
                    line.role === "ai" ? "text-green-400" : "text-background/80"
                  }`}
                >
                  <span className="text-background/40 mr-2">
                    {line.role === "ai" ? "🤖" : "👤"}
                  </span>
                  {line.text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Feature cards */}
          <div className="space-y-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-background border border-border"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {t(feat.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(feat.descKey)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button asChild size="lg" className="rounded-full text-base px-8 h-12">
            <Link to="/crear-skill">
              {t("landing.creatorCta")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default SkillCreatorSection;
