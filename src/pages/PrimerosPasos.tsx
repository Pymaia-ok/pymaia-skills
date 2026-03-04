import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PrimerosPasos = () => {
  const { t } = useTranslation();

  const steps = [
    { title: t("gettingStarted.step1Title"), description: t("gettingStarted.step1Desc") },
    { title: t("gettingStarted.step2Title"), description: t("gettingStarted.step2Desc") },
    { title: t("gettingStarted.step3Title"), description: t("gettingStarted.step3Desc") },
    { title: t("gettingStarted.step4Title"), description: t("gettingStarted.step4Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 max-w-3xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="section-title mb-4">{t("gettingStarted.title")}</h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">{t("gettingStarted.subtitle")}</p>
        </motion.div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-base font-semibold">{i + 1}</div>
              <div className="flex-1 pb-8 border-b border-border last:border-0">
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 text-center">
          <Link to="/explorar" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
            {t("gettingStarted.exploreSkills")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default PrimerosPasos;
