import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import SkillCard from "@/components/SkillCard";
import { fetchSkills, SKILL_CATEGORIES, PAGE_SIZE } from "@/lib/api";

const Explore = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "installs">("rating");
  const [page, setPage] = useState(0);

  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    debounceRef[0] = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 350);
  }, [debounceRef]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["skills", selectedCategory, sortBy, page, debouncedSearch],
    queryFn: () =>
      fetchSkills({
        category: selectedCategory || undefined,
        sortBy,
        page,
        search: debouncedSearch || undefined,
      }),
  });

  const skills = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("explore.searchPlaceholder")}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => { setSelectedCategory(null); setPage(0); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {t("explore.all")}
            </button>
            {SKILL_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => { setSelectedCategory(cat.key === selectedCategory ? null : cat.key); setPage(0); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
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
