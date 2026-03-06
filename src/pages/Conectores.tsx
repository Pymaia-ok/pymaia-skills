import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, BadgeCheck, Star, Download, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  "marketing",
  "analytics",
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
  marketing: "bg-fuchsia-500",
  analytics: "bg-indigo-500",
  general: "bg-gray-500",
};

const Conectores = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("cat") || null);
  const [officialFilter, setOfficialFilter] = useState<"all" | "official" | "community" | "verified">((searchParams.get("filter") as any) || "all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedCategory) params.set("cat", selectedCategory);
    if (officialFilter !== "all") params.set("filter", officialFilter);
    setSearchParams(params, { replace: true });
  }, [search, selectedCategory, officialFilter, setSearchParams]);
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
      const [curatedRes, topRes] = await Promise.all([
        supabase
          .from("mcp_servers")
          .select("id, name, slug, description, description_es, category, icon_url, credentials_needed, external_use_count, source, is_official, github_stars, security_status, last_commit_at")
          .eq("status", "approved")
          .eq("source", "curated"),
        supabase
          .from("mcp_servers")
          .select("id, name, slug, description, description_es, category, icon_url, credentials_needed, external_use_count, source, is_official, github_stars, security_status, last_commit_at")
          .eq("status", "approved")
          .neq("source", "curated")
          .order("external_use_count", { ascending: false })
          .limit(3000),
      ]);
      if (curatedRes.error) throw curatedRes.error;
      if (topRes.error) throw topRes.error;
      const seen = new Set((curatedRes.data || []).map(c => c.id));
      const merged = [...(curatedRes.data || [])];
      for (const c of (topRes.data || [])) {
        if (!seen.has(c.id)) merged.push(c);
      }
      return merged;
    },
  });

  // Deduplicate: prefer curated > official-registry > others, by base brand name
  const deduped = (() => {
    const SOURCE_PRIORITY: Record<string, number> = {
      curated: 0, "canva.dev": 1, "official-registry": 2, smithery: 3, glama: 4, "awesome-mcp-servers": 5, "0x7c2f": 6, manual: 7,
    };
    // Group by normalized brand name to detect dupes
    const seen = new Map<string, typeof connectors[0]>();
    const sorted = [...connectors].sort((a, b) => {
      const pa = SOURCE_PRIORITY[a.source || ""] ?? 99;
      const pb = SOURCE_PRIORITY[b.source || ""] ?? 99;
      return pa - pb;
    });
    for (const c of sorted) {
      // Normalize: "GitHub" and "Github MCP Server" -> "github"
      const baseName = c.name.toLowerCase()
        .replace(/\bmcp\b/gi, "").replace(/\bserver\b/gi, "").replace(/\btool\b/gi, "")
        .replace(/[-_]/g, " ").trim().replace(/\s+/g, " ");
      // Use slug for curated, baseName for others
      const key = c.source === "curated" ? c.slug : baseName;
      if (!seen.has(key)) {
        seen.set(key, c);
      }
    }
    return Array.from(seen.values());
  })();

  const filtered = deduped.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || c.category === selectedCategory;
    const matchesOfficial = officialFilter === "all" || 
      (officialFilter === "official" && c.is_official) ||
      (officialFilter === "community" && !c.is_official) ||
      (officialFilter === "verified" && (c as any).security_status === "verified");
    return matchesSearch && matchesCategory && matchesOfficial;
  }).sort((a, b) => {
    // Curated first, then by icon presence, then by use count
    const sa = a.source === "curated" ? 0 : 1;
    const sb = b.source === "curated" ? 0 : 1;
    if (sa !== sb) return sa - sb;
    const ia = a.icon_url ? 0 : 1;
    const ib = b.icon_url ? 0 : 1;
    if (ia !== ib) return ia - ib;
    return (b.external_use_count || 0) - (a.external_use_count || 0);
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
            className="relative mb-6 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("connectors.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className={`flex-shrink-0 w-14 rounded-2xl flex items-center justify-center transition-colors ${officialFilter !== "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-2">
                {(["all", "official", "community", "verified"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setOfficialFilter(f as any)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2 ${
                      officialFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {f === "official" && <BadgeCheck className="w-3.5 h-3.5" />}
                    {f === "verified" && <ShieldCheck className="w-3.5 h-3.5" />}
                    {f === "all" ? t("connectors.all") : f === "official" ? (isEs ? "Oficiales" : "Official") : f === "community" ? (isEs ? "Comunitarios" : "Community") : (isEs ? "Verificados" : "Verified")}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </motion.div>

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
                    className="p-6 rounded-2xl bg-secondary/50 border border-border hover:border-foreground/20 transition-all group h-[200px] flex flex-col"
                  >
                    <div className="flex items-start gap-4 mb-3 flex-shrink-0">
                      {connector.icon_url ? (
                        <>
                          <img
                            src={connector.icon_url}
                            alt={connector.name}
                            className="w-10 h-10 rounded-lg flex-shrink-0 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div className={`w-10 h-10 rounded-lg ${CATEGORY_COLORS[connector.category] || "bg-gray-500"} items-center justify-center flex-shrink-0 hidden`}>
                            <span className="text-lg font-bold text-white">
                              {connector.name[0]?.toUpperCase()}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ${CATEGORY_COLORS[connector.category] || "bg-gray-500"} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-lg font-bold text-white">
                            {connector.name[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {connector.name}
                          </h3>
                          {connector.is_official && (
                            <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                          {(connector as any).security_status === "verified" && !connector.is_official && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {t(`connectors.${connector.category}`, connector.category)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1 min-h-0">
                      {isEs && connector.description_es
                        ? connector.description_es
                        : connector.description}
                    </p>
                    {/* Trust metrics */}
                    {((connector.github_stars ?? 0) > 0 || (connector.external_use_count ?? 0) > 0) && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                        {(connector.github_stars ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="w-3 h-3" />
                            {connector.github_stars?.toLocaleString()}
                          </span>
                        )}
                        {(connector.external_use_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Download className="w-3 h-3" />
                            {connector.external_use_count?.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/60 ml-auto capitalize">
                          {connector.source === 'curated' ? '' : connector.source?.replace(/-/g, ' ')}
                        </span>
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
