import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const CATEGORIES = [
  "communication",
  "development",
  "databases",
  "productivity",
  "search",
  "automation",
  "apis",
  "cloud",
  "ai",
  "design",
  "storage",
  "general",
];

const CATEGORY_COLORS: Record<string, string> = {
  communication: "bg-blue-500",
  development: "bg-emerald-500",
  databases: "bg-amber-500",
  productivity: "bg-violet-500",
  search: "bg-cyan-500",
  automation: "bg-orange-500",
  apis: "bg-pink-500",
  cloud: "bg-sky-500",
  ai: "bg-purple-500",
  design: "bg-rose-500",
  storage: "bg-teal-500",
  general: "bg-gray-500",
};

const Conectores = () => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    window.addEventListener("resize", updateScrollIndicators);
    return () => window.removeEventListener("resize", updateScrollIndicators);
  }, [updateScrollIndicators]);

  const scrollCategories = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    setTimeout(updateScrollIndicators, 300);
  };

  useSEO({
    title: "Conectores — Pymaia Skills",
    description: "Connect your AI with Gmail, GitHub, Slack and more. Browse connectors that supercharge your skills.",
    canonical: "https://pymaiaskills.lovable.app/conectores",
  });

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ["connectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcp_servers")
        .select("*")
        .eq("status", "approved")
        .order("external_use_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = connectors.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isEs = i18n.language === "es";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="section-title mb-4">{t("connectors.title")}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t("connectors.subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative mb-6"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("connectors.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </motion.div>

          <div className="relative mb-8">
            {canScrollLeft && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <button
                  onClick={() => scrollCategories("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            )}
            {canScrollRight && (
              <>
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                <button
                  onClick={() => scrollCategories("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <div
              ref={scrollRef}
              onScroll={updateScrollIndicators}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  !selectedCategory
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("connectors.all")}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setSelectedCategory(cat === selectedCategory ? null : cat)
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    selectedCategory === cat
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`connectors.${cat}`, cat)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-secondary animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((connector, i) => (
                <motion.div
                  key={connector.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                >
                  <Link
                    to={`/conector/${connector.slug}`}
                    className="block p-6 rounded-2xl bg-secondary/50 border border-border hover:border-foreground/20 transition-all group h-[200px] flex flex-col"
                  >
                    <div className="flex items-start gap-4 mb-3">
                      {connector.icon_url ? (
                        <img
                          src={connector.icon_url}
                          alt={connector.name}
                          className="w-10 h-10 rounded-lg flex-shrink-0 object-contain"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ${CATEGORY_COLORS[connector.category] || "bg-gray-500"} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-lg font-bold text-white">
                            {connector.name[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {connector.name}
                        </h3>
                        <span className="text-xs text-muted-foreground capitalize">
                          {t(`connectors.${connector.category}`, connector.category)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] flex-1">
                      {isEs && connector.description_es
                        ? connector.description_es
                        : connector.description}
                    </p>
                    {connector.credentials_needed &&
                      connector.credentials_needed.length > 0 && (
                        <div className="mt-auto pt-3 flex flex-wrap gap-1 overflow-hidden max-h-[1.75rem]">
                          {connector.credentials_needed.slice(0, 3).map((cred: string) => (
                            <span
                              key={cred}
                              className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground truncate max-w-[140px]"
                            >
                              {cred}
                            </span>
                          ))}
                        </div>
                      )}
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No connectors found.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conectores;
