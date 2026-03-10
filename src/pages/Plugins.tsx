import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, BadgeCheck, Download, SlidersHorizontal, ShieldCheck, Monitor, Users2, Star, Award } from "lucide-react";
import { TrustBadgeCompact } from "@/components/TrustBadge";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PLATFORM_LABELS: Record<string, { en: string; es: string; icon: typeof Monitor }> = {
  "claude-code": { en: "Claude Code", es: "Claude Code", icon: Monitor },
  cowork: { en: "Cowork", es: "Cowork", icon: Users2 },
  both: { en: "Both", es: "Ambos", icon: Monitor },
};

const CATEGORY_OPTIONS = [
  "development", "productivity", "writing", "data", "design", "marketing", "devops", "security", "ai", "general"
];

const Plugins = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [platformFilter, setPlatformFilter] = useState<string>(searchParams.get("platform") || "all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>(searchParams.get("filter") || "all");
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get("category") || "all");
  const [sourceFilter, setSourceFilter] = useState<string>(searchParams.get("source") || "all");
  const isEs = i18n.language === "es";

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (platformFilter !== "all") params.set("platform", platformFilter);
    if (verifiedFilter !== "all") params.set("filter", verifiedFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    setSearchParams(params, { replace: true });
  }, [search, platformFilter, verifiedFilter, categoryFilter, sourceFilter, setSearchParams]);

  useSEO({
    title: isEs ? "Plugins para Claude — Pymaia Skills" : "Claude Plugins — Pymaia Skills",
    description: isEs
      ? "Explorá plugins oficiales y comunitarios para Claude Code y Cowork. Instalá paquetes de herramientas, skills y MCPs en un click."
      : "Browse official and community plugins for Claude Code and Cowork. Install bundles of tools, skills and MCPs in one click.",
    canonical: "https://pymaiaskills.lovable.app/plugins",
  });

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plugins" as any)
        .select("*")
        .eq("status", "approved")
        .order("install_count", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = plugins.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !search || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
    const matchesPlatform = platformFilter === "all" || p.platform === platformFilter || (platformFilter === "claude-code" && p.platform === "both") || (platformFilter === "cowork" && p.platform === "both");
    const matchesVerified = verifiedFilter === "all" ||
      (verifiedFilter === "anthropic-verified" && p.is_anthropic_verified) ||
      (verifiedFilter === "pymaia-verified" && p.source === "community" && p.creator_id) ||
      (verifiedFilter === "verified" && p.security_status === "verified") ||
      (verifiedFilter === "community" && !p.is_official);
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchesSource = sourceFilter === "all" ||
      (sourceFilter === "curated" && (p.is_official || p.is_anthropic_verified)) ||
      (sourceFilter === "community" && !p.is_official && !p.is_anthropic_verified);
    return matchesSearch && matchesPlatform && matchesVerified && matchesCategory && matchesSource;
  });

  // Separate curated vs community for section display
  const curatedPlugins = filtered.filter(p => p.is_official || p.is_anthropic_verified);
  const communityPlugins = filtered.filter(p => !p.is_official && !p.is_anthropic_verified);
  const showSections = sourceFilter === "all" && !search && categoryFilter === "all" && verifiedFilter === "all";

  const getBadge = (plugin: any) => {
    if (plugin.is_anthropic_verified) return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
        <BadgeCheck className="w-3 h-3" />
        Anthropic Verified
      </span>
    );
    if (plugin.source === "community" && plugin.creator_id) return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold">
        <Award className="w-3 h-3" />
        Pymaia Verified
      </span>
    );
    if (plugin.is_official) return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
        <ShieldCheck className="w-3 h-3" />
        {isEs ? "Oficial" : "Official"}
      </span>
    );
    if (plugin.security_status === "verified") return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
        <ShieldCheck className="w-3 h-3" />
        {isEs ? "Verificado" : "Verified"}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] font-semibold">
        {isEs ? "Comunitario" : "Community"}
      </span>
    );
  };

  const renderPluginCard = (plugin: any, i: number) => (
    <motion.div
      key={plugin.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.5) }}
    >
      <Link
        to={`/plugin/${plugin.slug}`}
        className="p-6 rounded-2xl bg-secondary/50 border border-border hover:border-foreground/20 transition-all group h-[200px] flex flex-col"
      >
        <div className="flex items-start gap-4 mb-3 flex-shrink-0">
          {plugin.icon_url ? (
            <img src={plugin.icon_url} alt={plugin.name} className="w-10 h-10 rounded-lg flex-shrink-0 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">{plugin.name[0]?.toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {isEs && plugin.name_es ? plugin.name_es : plugin.name}
              </h3>
              {plugin.is_anthropic_verified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
            </div>
            <span className="text-xs text-muted-foreground">
              {plugin.platform === "both" ? "Claude Code + Cowork" : plugin.platform === "claude-code" ? "Claude Code" : "Cowork"}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 min-h-0">
          {isEs && plugin.description_es ? plugin.description_es : plugin.description}
        </p>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 flex-wrap">
          <TrustBadgeCompact trustScore={plugin.trust_score ?? 0} securityStatus={plugin.security_status} />
          {getBadge(plugin)}
          {plugin.avg_rating > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-foreground text-foreground" />
              {Number(plugin.avg_rating).toFixed(1)}
            </span>
          )}
          {plugin.install_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="w-3 h-3" />
              {plugin.install_count.toLocaleString()}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="section-title mb-4">{t("plugins.title")}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">{t("plugins.subtitle")}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("plugins.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className={`flex-shrink-0 w-14 rounded-2xl flex items-center justify-center transition-colors ${(platformFilter !== "all" || verifiedFilter !== "all" || categoryFilter !== "all" || sourceFilter !== "all") ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2 max-h-[70vh] overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground px-3 py-1">{isEs ? "Plataforma" : "Platform"}</p>
                {["all", "claude-code", "cowork"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${platformFilter === p ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                  >
                    {p === "all" ? (isEs ? "Todas" : "All") : p === "claude-code" ? "Claude Code" : "Cowork"}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <p className="text-xs font-semibold text-muted-foreground px-3 py-1">{isEs ? "Origen" : "Source"}</p>
                {["all", "curated", "community"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${sourceFilter === s ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                  >
                    {s === "all" ? (isEs ? "Todos" : "All") : s === "curated" ? (isEs ? "Curados" : "Curated") : (isEs ? "Comunidad" : "Community")}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <p className="text-xs font-semibold text-muted-foreground px-3 py-1">{isEs ? "Verificación" : "Verification"}</p>
                {["all", "anthropic-verified", "pymaia-verified", "verified", "community"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setVerifiedFilter(f)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2 ${verifiedFilter === f ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                  >
                     {f === "anthropic-verified" && <BadgeCheck className="w-3.5 h-3.5" />}
                     {f === "pymaia-verified" && <Award className="w-3.5 h-3.5" />}
                     {f === "verified" && <ShieldCheck className="w-3.5 h-3.5" />}
                     {f === "all" ? (isEs ? "Todos" : "All") : f === "anthropic-verified" ? "Anthropic Verified" : f === "pymaia-verified" ? "Pymaia Verified" : f === "verified" ? (isEs ? "Verificados" : "Verified") : (isEs ? "Comunitarios" : "Community")}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <p className="text-xs font-semibold text-muted-foreground px-3 py-1">{isEs ? "Categoría" : "Category"}</p>
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                >
                  {isEs ? "Todas" : "All"}
                </button>
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left capitalize ${categoryFilter === c ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                  >
                    {c}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </motion.div>

          {/* Platform pills */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "claude-code", "cowork"].map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${platformFilter === p ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {p === "all" ? (isEs ? "Todos" : "All") : p === "claude-code" ? "Claude Code" : "Cowork"}
              </button>
            ))}
            <div className="h-6 w-px bg-border mx-1" />
            {["all", "curated", "community"].map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${sourceFilter === s ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {s === "all" ? (isEs ? "Origen" : "Source") : s === "curated" ? (isEs ? "Curados" : "Curated") : (isEs ? "Comunidad" : "Community")}
              </button>
            ))}
          </div>

          {/* Active filters indicator */}
          {(categoryFilter !== "all" || verifiedFilter !== "all") && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {categoryFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter("all")} className="hover:text-primary/70">×</button>
                </span>
              )}
              {verifiedFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {verifiedFilter}
                  <button onClick={() => setVerifiedFilter("all")} className="hover:text-primary/70">×</button>
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : showSections ? (
            <>
              {/* Curated section */}
              {curatedPlugins.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">{isEs ? "Curados por Pymaia" : "Curated by Pymaia"}</h2>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{curatedPlugins.length}</span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {curatedPlugins.map((plugin, i) => renderPluginCard(plugin, i))}
                  </div>
                </div>
              )}

              {/* Community section */}
              {communityPlugins.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users2 className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">{isEs ? "Creados por la comunidad" : "Community created"}</h2>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{communityPlugins.length}</span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {communityPlugins.map((plugin, i) => renderPluginCard(plugin, i))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((plugin, i) => renderPluginCard(plugin, i))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">{isEs ? "No se encontraron plugins." : "No plugins found."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Plugins;
