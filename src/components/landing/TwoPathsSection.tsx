import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Rocket } from "lucide-react";

const TwoPathsSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-4">{t("landing.pathsTitle")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.pathsSubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Already uses Claude Code */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-3xl border-2 border-foreground bg-foreground text-background"
          >
            <Rocket className="w-10 h-10 mb-6" />
            <h3 className="text-2xl font-bold mb-3">{t("landing.pathExpertTitle")}</h3>
            <p className="text-background/70 mb-8 leading-relaxed">{t("landing.pathExpertDesc")}</p>
            <Button asChild variant="secondary" size="lg" className="rounded-full">
              <Link to="/explorar">
                {t("landing.pathExpertCta")} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </motion.div>

          {/* New to Claude Code */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-3xl border-2 border-border bg-secondary"
          >
            <Lightbulb className="w-10 h-10 mb-6 text-foreground" />
            <h3 className="text-2xl font-bold mb-3">{t("landing.pathNewTitle")}</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">{t("landing.pathNewDesc")}</p>
            <Button asChild size="lg" className="rounded-full">
              <Link to="/primeros-pasos">
                {t("landing.pathNewCta")} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TwoPathsSection;
