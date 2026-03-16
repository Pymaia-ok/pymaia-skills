import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layers, Target, ShieldCheck } from "lucide-react";

const pillars = [
  { icon: Layers, titleKey: "whyCatalogTitle", descKey: "whyCatalogDesc" },
  { icon: Target, titleKey: "whyGoalTitle", descKey: "whyGoalDesc" },
  { icon: ShieldCheck, titleKey: "whySecurityTitle", descKey: "whySecurityDesc" },
];

const WhyPymaiaSection = () => {
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
          <h2 className="section-title mb-4">{t("landing.whyTitle")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.whySubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((p, i) => (
            <motion.div
              key={p.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.12 }}
              className="rounded-2xl border border-border bg-card p-8 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-6">
                <p.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t(`landing.${p.titleKey}`)}</h3>
              <p className="text-muted-foreground leading-relaxed">{t(`landing.${p.descKey}`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyPymaiaSection;
