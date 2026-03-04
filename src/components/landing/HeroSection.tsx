import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground mb-8 border border-border">
            <Sparkles className="w-4 h-4" />
            {t("landing.heroBadge")}
          </div>

          <h1 className="hero-title mb-6 whitespace-pre-line">
            {t("landing.heroTitle")}
          </h1>

          <p className="hero-subtitle max-w-2xl mx-auto mb-8">
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
      </div>
    </section>
  );
};

export default HeroSection;
