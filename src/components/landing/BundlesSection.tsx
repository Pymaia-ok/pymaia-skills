import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fetchAllBundles } from "@/lib/api";

const roleIcons: Record<string, string> = {
  marketer: "📣", abogado: "⚖️", consultor: "💼", founder: "🚀", disenador: "🎨",
  ingeniero: "🔧", arquitecto: "🏗️", medico: "🩺", profesor: "🎓", otro: "✨",
  ventas: "💰", "product-manager": "🗺️", "data-analyst": "📊", devops: "⚙️", rrhh: "👥",
};

const BundlesSection = () => {
  const { t, i18n } = useTranslation();
  const { data: bundles = [] } = useQuery({
    queryKey: ["bundles-all"],
    queryFn: fetchAllBundles,
  });

  if (bundles.length === 0) return null;

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
          {bundles.map((bundle, i) => {
            const title = i18n.language === "es" && bundle.title_es ? bundle.title_es : bundle.title;
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
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-secondary hover:bg-accent transition-colors text-center group"
                >
                  <span className="text-4xl">{bundle.hero_emoji || roleIcons[bundle.role_slug] || "📦"}</span>
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-xs text-muted-foreground">
                    {bundle.skill_slugs.length} skills
                  </span>
                  <span className="text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("bundles.viewPack")} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BundlesSection;
