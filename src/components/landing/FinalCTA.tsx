import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-foreground text-background">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-background/60 text-lg mb-10 max-w-xl mx-auto">
            {t("landing.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="secondary" size="lg" className="text-base px-8 h-12 rounded-full">
              <Link to="/explorar">
                {t("landing.ctaExplore")} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-base px-8 h-12 rounded-full text-background/70 hover:text-background hover:bg-background/10">
              <Link to="/primeros-pasos">
                {t("landing.ctaLearn")}
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
