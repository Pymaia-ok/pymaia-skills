import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fetchAllBundles } from "@/lib/api";

// Unique emoji per role — no repeats
const roleIcons: Record<string, string> = {
  marketer: "📣",
  abogado: "⚖️",
  consultor: "💼",
  founder: "🚀",
  disenador: "🎨",
  ingeniero: "🔧",
  medico: "🏥",
  profesor: "👨‍🏫",
  otro: "✨",
  ventas: "💰",
  "product-manager": "🗺️",
  "data-analyst": "📊",
  devops: "⚙️",
  rrhh: "👥",
  arquitecto: "🏗️",
};

const BundlesSection = () => {
  const { t, i18n } = useTranslation();
  const { data: bundles = [] } = useQuery({
    queryKey: ["bundles-all"],
    queryFn: fetchAllBundles,
  });

  // Only show active bundles
  const activeBundles = bundles.filter((b) => b.is_active);

  if (activeBundles.length === 0) return null;

  // Force grid to be a multiple of 5 — pad if needed
  const gridSize = Math.ceil(activeBundles.length / 5) * 5;
  const needsPadding = activeBundles.length < gridSize;

  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <h2 className="section-title mb-4">{t("bundles.title")}</h2>
          <p className="text-muted-foreground text-lg">{t("bundles.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {activeBundles.map((bundle, i) => {
            const title = i18n.language === "es" && bundle.title_es ? bundle.title_es : bundle.title;
            const emoji = bundle.hero_emoji || roleIcons[bundle.role_slug] || "📦";
            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/para/${bundle.role_slug}`}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-secondary hover:bg-accent transition-colors text-center group h-44"
                >
                  <span className="text-4xl">{emoji}</span>
                  <span className="text-sm font-semibold line-clamp-2">{title}</span>
                  <span className="text-xs text-muted-foreground">
                    {bundle.skill_slugs.length} skills
                  </span>
                </Link>
              </motion.div>
            );
          })}
          {/* If last row is incomplete, add a "explore all" card */}
          {needsPadding && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: activeBundles.length * 0.05 }}
            >
              <Link
                to="/explorar"
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-secondary/50 hover:bg-accent transition-colors text-center group h-44 border-2 border-dashed border-border"
              >
                <span className="text-4xl">🔍</span>
                <span className="text-sm font-semibold">{t("landing.popularCta")}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BundlesSection;
