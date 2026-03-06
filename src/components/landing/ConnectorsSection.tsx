import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Curated list of well-known connectors to show on landing
const FEATURED_SLUGS = [
  "gmail", "slack", "smithery-ai-github", "notion",
  "googlesheets", "stripe", "instagram", "discord",
  "googledrive", "googlecalendar", "tacticlaunch-mcp-linear", "ai-zerolab-mcp-figma",
];

const CATEGORY_EMOJIS: Record<string, string> = {
  communication: "💬",
  development: "🛠️",
  databases: "🗄️",
  productivity: "📋",
  search: "🔍",
  automation: "⚡",
  apis: "🔌",
  cloud: "☁️",
  ai: "🤖",
  design: "🎨",
  storage: "📁",
  general: "🔧",
};

const ConnectorsSection = () => {
  const { t } = useTranslation();

  const { data: connectors = [] } = useQuery({
    queryKey: ["landing-connectors-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mcp_servers")
        .select("name, slug, category, icon_url, external_use_count")
        .eq("status", "approved")
        .in("slug", FEATURED_SLUGS);

      if (!data) return [];
      // Sort by the curated order
      return FEATURED_SLUGS
        .map(s => data.find(c => c.slug === s))
        .filter(Boolean) as typeof data;
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground mb-6 border border-border">
            <Plug className="w-4 h-4" />
            {t("landing.connectorsTag")}
          </div>
          <h2 className="section-title mb-4">{t("landing.connectorsTitle")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("landing.connectorsSubtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-10">
          {connectors.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/conector/${c.slug}`}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-secondary hover:bg-accent border border-border transition-all group"
              >
                {c.icon_url ? (
                  <img
                    src={c.icon_url}
                    alt={c.name}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const span = document.createElement("span");
                        span.className = "text-3xl";
                        span.textContent = CATEGORY_EMOJIS[c.category] || "🔧";
                        parent.insertBefore(span, e.target as HTMLImageElement);
                      }
                    }}
                  />
                ) : (
                  <span className="text-3xl">
                    {CATEGORY_EMOJIS[c.category] || "🔧"}
                  </span>
                )}
                <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors truncate max-w-full">
                  {c.name}
                </span>
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
            <Link to="/conectores">
              {t("landing.connectorsCtaAll")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ConnectorsSection;
