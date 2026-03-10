import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Clock, ArrowRight } from "lucide-react";

const examples = ["marketer", "abogado", "founder"] as const;

const BeforeAfterSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-secondary/40">
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
              transition={{ delay: i * 0.12 }}
              className="rounded-2xl border border-border overflow-hidden bg-background"
            >
              {/* Role header */}
              <div className="px-6 pt-6 pb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t(`landing.ba${ex}Role`)}
                </div>
                <h3 className="text-lg font-semibold">{t(`landing.ba${ex}Task`)}</h3>
              </div>

              {/* Before */}
              <div className="px-6 py-4 bg-destructive/5 border-y border-border">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
                    <span className="text-destructive font-bold text-xs">✗</span>
                  </span>
                  <p className="text-sm text-muted-foreground">{t(`landing.ba${ex}Before`)}</p>
                </div>
              </div>

              {/* After */}
              <div className="px-6 py-4 bg-green-500/5">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
                    <span className="text-green-600 font-bold text-xs">✓</span>
                  </span>
                  <p className="text-sm font-medium">{t(`landing.ba${ex}After`)}</p>
                </div>
              </div>

              {/* Time saved — big and bold */}
              <div className="px-6 py-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {t(`landing.ba${ex}Time`)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
