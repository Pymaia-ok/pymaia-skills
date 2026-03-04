import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const examples = ["marketer", "abogado", "founder"] as const;

const BeforeAfterSection = () => {
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
          <h2 className="section-title mb-4">{t("landing.beforeAfterTitle")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.beforeAfterSubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {examples.map((ex, i) => (
            <motion.div
              key={ex}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border overflow-hidden"
            >
              <div className="p-6 bg-secondary">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t(`landing.ba${ex}Role`)}
                </div>
                <h3 className="text-lg font-semibold mb-4">{t(`landing.ba${ex}Task`)}</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-destructive font-bold text-sm mt-0.5">✗</span>
                    <p className="text-sm text-muted-foreground">{t(`landing.ba${ex}Before`)}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <p className="text-sm">{t(`landing.ba${ex}After`)}</p>
                </div>
                <div className="mt-4 text-xs font-medium text-muted-foreground">
                  {t(`landing.ba${ex}Time`)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
