import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Puzzle, Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FEATURED_SLUGS = [
  "slack-plugin",          // Comunicación
  "brand-voice",           // Marketing
  "sales-development",     // Ventas
  "figma-plugin",          // Diseño
  "financial-analysis",    // Finanzas
  "atlassian-plugin",      // Productividad
  "asana-plugin",          // Gestión de tareas
  "operations",            // Operaciones
  "design-plugin",         // Diseño UX
  "circleback",            // Reuniones
  "linear-plugin",         // Gestión de proyectos
  "equity-research",       // Investigación financiera
];

const CATEGORY_ICONS: Record<string, string> = {
  communication: "💬",
  marketing: "📣",
  sales: "🤝",
  design: "🎨",
  finance: "💰",
  productivity: "📋",
  operations: "⚙️",
  analytics: "📊",
};

const PluginsSection = () => {
  const { t } = useTranslation();

  const { data: plugins = [] } = useQuery({
    queryKey: ["landing-plugins-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plugins")
        .select("name, slug, category, icon_url, install_count, is_anthropic_verified, is_official")
        .eq("status", "approved")
        .in("slug", FEATURED_SLUGS);

      if (!data) return [];
      return FEATURED_SLUGS
        .map(s => data.find(p => p.slug === s))
        .filter(Boolean) as typeof data;
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground mb-6 border border-border">
            <Puzzle className="w-4 h-4" />
            {t("landing.pluginsTag")}
          </div>
          <h2 className="section-title mb-4">{t("landing.pluginsTitle")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("landing.pluginsSubtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
          {plugins.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/plugin/${p.slug}`}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-background hover:bg-accent border border-border transition-all group relative"
              >
                {p.is_anthropic_verified && (
                  <span className="absolute top-2 right-2">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                  </span>
                )}
                {p.icon_url ? (
                  <img
                    src={p.icon_url}
                    alt={p.name}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-3xl">
                    {CATEGORY_ICONS[p.category] || "🧩"}
                  </span>
                )}
                <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors truncate max-w-full text-center">
                  {p.name}
                </span>
                {p.install_count > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {p.install_count.toLocaleString()}
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/plugins">
              {t("landing.pluginsCtaAll")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default PluginsSection;
