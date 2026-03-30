import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Sparkles, Plug, Bot, ShieldCheck, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import SkillCard from "@/components/SkillCard";
import RisingStars from "@/components/landing/RisingStars";
import { fetchSkills, semanticSearch, isIntentQuery, SKILL_CATEGORIES_FALLBACK, fetchCategories, PAGE_SIZE } from "@/lib/api";
import type { CategoryFromDB } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSEO } from "@/hooks/useSEO";

const Explore = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const isEs = i18n.language?.startsWith("es");

  useSEO({
    title: isEs ? "Explorar soluciones — Pymaia Skills" : "Explore Skills — Pymaia Skills",
    description: isEs
      ? "Navegá 35,000+ soluciones para agentes de IA. Compatible con Claude, Manus, Cursor, Antigravity y OpenClaw. Filtrá por 19 categorías."
      : "Browse 35,000+ skills for AI coding agents. Compatible with Claude, Manus, Cursor, Antigravity & OpenClaw. Filter by 19 categories and find the perfect skill.",
    canonical: "https://pymaiaskills.lovable.app/explorar",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Explore Skills — Pymaia Skills",
      description: "Browse 35,000+ professional skills for AI coding agents across 19 categories.",
      url: "https://pymaiaskills.lovable.app/explorar",
      isPartOf: {
        "@type": "WebSite",
        name: "Pymaia Skills",
        url: "https://pymaiaskills.lovable.app",
      },
    },
  });

  const initialSearch = searchParams.get("q") || "";
  const initialCategory = searchParams.get("cat") || null;
  const initialSort = (searchParams.get("sort") as "rating" | "installs") || "rating";
  const initialPage = parseInt(searchParams.get("page") || "0", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  
  const [sortBy, setSortBy] = useState<"rating" | "installs">(initialSort);
  const [page, setPage] = useState(initialPage);

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
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const isSmartMode = isIntentQuery(debouncedSearch);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (selectedCategory) params.set("cat", selectedCategory);
    
    if (sortBy !== "rating") params.set("sort", sortBy);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedCategory, sortBy, page, setSearchParams]);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, isIntentQuery(val) ? 600 : 350);
  }, []);

  // Standard keyword search
  const { data: keywordResult, isLoading: keywordLoading } = useQuery({
    queryKey: ["skills", selectedCategory, sortBy, page, debouncedSearch],
    queryFn: () =>
      fetchSkills({
        category: selectedCategory || undefined,
        sortBy,
        page,
        search: debouncedSearch || undefined,
      }),
    enabled: !isSmartMode,
  });

  // Smart AI-powered semantic search
  const { data: smartResult, isLoading: smartLoading } = useQuery({
    queryKey: ["semantic-search", selectedCategory, sortBy, page, debouncedSearch],
    queryFn: () =>
      semanticSearch({
        query: debouncedSearch,
        category: selectedCategory || undefined,
        sortBy,
        page,
      }),
    enabled: isSmartMode,
    retry: 1,
  });

  const result = isSmartMode ? smartResult : keywordResult;
  const isLoading = isSmartMode ? smartLoading : keywordLoading;

  const skills = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const smartKeywords = isSmartMode && (smartResult as any)?.keywords ? (smartResult as any).keywords : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="section-title mb-4">{t("explore.title")}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {(t("explore.subtitle") as string).replace("{{count}}", totalCount.toLocaleString())}
            </p>
          </motion.div>

          {/* New to Claude banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8 p-4 rounded-2xl bg-secondary border border-border flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("explore.newToClaude")}</span>
                {" "}{t("explore.newToClaudeDesc")}
              </p>
            </div>
            <Link
              to="/primeros-pasos"
              className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t("explore.newToClaudeCta")}
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-2">
            <label htmlFor="skill-search" className="sr-only">{t("explore.searchPlaceholderSmart")}</label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              id="skill-search"
              type="text"
              placeholder={t("explore.searchPlaceholderSmart")}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </motion.div>

          <AnimatePresence>
            {isSmartMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mb-6 px-1"
              >
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {smartLoading
                    ? t("explore.smartSearching")
                    : smartKeywords
                    ? t("explore.smartResults") + ` · ${smartKeywords.join(", ")}`
                    : t("explore.smartResults")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isSmartMode && <div className="mb-6" />}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="relative mb-4">
            {canScrollLeft && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <button
                  onClick={() => scrollCategories("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-accent transition-colors"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
              </>
            )}
            {canScrollRight && (
              <>
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                <button
                  onClick={() => scrollCategories("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-accent transition-colors"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              </>
            )}
            <div
              ref={scrollRef}
              onScroll={updateScrollIndicators}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            >
              <button
                onClick={() => { setSelectedCategory(null); setPage(0); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${!selectedCategory ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {t("explore.all")}
              </button>
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setSelectedCategory(cat.key === selectedCategory ? null : cat.key); setPage(0); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === cat.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {t(`categories.${cat.key}`, cat.label)}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="flex gap-4 mb-8 text-sm">
            <button
              onClick={() => { setSortBy("rating"); setPage(0); }}
              className={`transition-colors ${sortBy === "rating" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("explore.topRated")}
            </button>
            <button
              onClick={() => { setSortBy("installs"); setPage(0); }}
              className={`transition-colors ${sortBy === "installs" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("explore.mostUsed")}
            </button>
          </div>

          {/* Rising Stars */}
          {!debouncedSearch && !selectedCategory && page === 0 && <RisingStars />}

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {skills.map((skill, i) => (
                <SkillCard key={skill.id} skill={skill} index={i} />
              ))}
            </div>
          )}

          {!isLoading && skills.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">{t("explore.noResults")}</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-xl bg-secondary text-foreground disabled:opacity-30 hover:bg-accent transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-muted-foreground">
                {t("explore.page", { current: page + 1, total: totalPages })}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-xl bg-secondary text-foreground disabled:opacity-30 hover:bg-accent transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* MCP connector banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary to-accent/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("explore.mcpBannerTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("explore.mcpBannerSubtitle")}</p>
              </div>
            </div>
            <Link
              to="/conector/pymaia-skills"
              className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t("explore.mcpBannerCta")}
            </Link>
          </motion.div>

          {/* Cross-link banner to Connectors */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 p-5 rounded-2xl bg-secondary border border-border flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Plug className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("explore.connectorsBannerTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("explore.connectorsBannerSubtitle")}</p>
              </div>
            </div>
            <Link
              to="/conectores"
              className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t("explore.connectorsBannerCta")}
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
