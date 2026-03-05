import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SkillCard from "@/components/SkillCard";
import { fetchSkills, smartSearch, isIntentQuery, SKILL_CATEGORIES, PAGE_SIZE } from "@/lib/api";
import { useSEO } from "@/hooks/useSEO";

const Explore = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  useSEO({
    title: "Explore Skills — Pymaia Skills",
    description: "Browse thousands of skills for Claude Code. Filter by category, search by name, and find the perfect skill for your work.",
    canonical: "https://pymaiaskills.lovable.app/explorar",
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

  const isSmartMode = isIntentQuery(debouncedSearch);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (selectedCategory) params.set("cat", selectedCategory);
    if (sortBy !== "rating") params.set("sort", sortBy);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedCategory, sortBy, page, setSearchParams]);

  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    debounceRef[0] = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, isIntentQuery(val) ? 600 : 350);
  }, [debounceRef]);

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

  // Smart AI-powered search
  const { data: smartResult, isLoading: smartLoading } = useQuery({
    queryKey: ["smart-search", selectedCategory, sortBy, page, debouncedSearch],
    queryFn: () =>
      smartSearch({
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
  const smartKeywords = isSmartMode && smartResult?.keywords ? smartResult.keywords : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="section-title mb-4">{t("explore.title")}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {(t("explore.subtitle") as string).replace("{{count}}", totalCount.toLocaleString())}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("explore.searchPlaceholderSmart", "Search by name or describe what you want to do...")}
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
                    ? t("explore.smartSearching", "Understanding what you need...")
                    : smartKeywords
                    ? t("explore.smartResults", "AI-powered results") + ` · ${smartKeywords.join(", ")}`
                    : t("explore.smartResults", "AI-powered results")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isSmartMode && <div className="mb-6" />}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
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
        </div>
      </div>
    </div>
  );
};

export default Explore;
