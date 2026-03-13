import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, Star, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface RisingStar {
  slug: string;
  display_name: string;
  tagline: string;
  category: string;
  install_count: number;
  avg_rating: number;
  github_stars: number;
  created_at: string;
}

export default function RisingStars() {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const { data: stars } = useQuery({
    queryKey: ["rising-stars"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("skills")
        .select("slug, display_name, tagline, category, install_count, avg_rating, github_stars, created_at")
        .eq("status", "approved")
        .eq("is_public", true)
        .gte("created_at", thirtyDaysAgo)
        .order("install_count", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data || []).filter((s: any) => s.install_count > 0 || s.github_stars > 0) as RisingStar[];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!stars?.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">
          {isEs ? "Rising Stars" : "Rising Stars"}
        </h2>
        <span className="text-xs text-muted-foreground ml-1">
          {isEs ? "Nuevas con tracción rápida" : "New with rapid traction"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stars.map((s, i) => {
          const daysAgo = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
          return (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/skill/${s.slug}`}
                className="flex items-start gap-3 p-4 rounded-xl bg-secondary hover:bg-accent transition-colors group"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate group-hover:text-foreground transition-colors">
                    {s.display_name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{s.tagline}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {s.install_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Download className="w-3 h-3" /> {s.install_count}
                      </span>
                    )}
                    {s.github_stars > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3" /> {s.github_stars}
                      </span>
                    )}
                    <span className="text-primary font-medium">
                      {daysAgo === 0 ? (isEs ? "hoy" : "today") : `${daysAgo}d`}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
