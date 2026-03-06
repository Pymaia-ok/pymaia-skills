import { motion } from "framer-motion";
import { Bot, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const McpBannerSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-secondary to-accent/20 border border-border p-10 md:p-14"
        >
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 p-4 rounded-2xl bg-primary/15 border border-primary/20">
              <Bot className="w-10 h-10 text-primary" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {t("landing.mcpTitle")}
              </h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-xl">
                {t("landing.mcpSubtitle")}
              </p>
            </div>

            <Link
              to="/conectores/pymaia-skills"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t("landing.mcpCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default McpBannerSection;
