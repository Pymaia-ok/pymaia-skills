import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Target, ShieldCheck, Zap } from "lucide-react";

const steps = [
  { icon: Target, key: "step1" },
  { icon: ShieldCheck, key: "step2" },
  { icon: Zap, key: "step3" },
];

const HowItWorks = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-secondary/50">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-4">{t("landing.howTitle")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.howSubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground text-background mb-6">
                <step.icon className="w-7 h-7" />
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t border-dashed border-border" />
              )}
              <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                {t(`landing.howStep${i + 1}Label`)}
              </div>
              <h3 className="text-xl font-semibold mb-2">{t(`landing.how${step.key}Title`)}</h3>
              <p className="text-muted-foreground leading-relaxed">{t(`landing.how${step.key}Desc`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
