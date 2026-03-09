import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, BadgeCheck, Download, SlidersHorizontal, ShieldCheck, Monitor, Users2 } from "lucide-react";
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

const Plugins = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [platformFilter, setPlatformFilter] = useState<string>(searchParams.get("platform") || "all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>(searchParams.get("filter") || "all");
  const isEs = i18n.language === "es";

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (platformFilter !== "all") params.set("platform", platformFilter);
    if (verifiedFilter !== "all") params.set("filter", verifiedFilter);
    setSearchParams(params, { replace: true });
  }, [search, platformFilter, verifiedFilter, setSearchParams]);

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
      (verifiedFilter === "verified" && p.security_status === "verified") ||
      (verifiedFilter === "community" && !p.is_official);
    return matchesSearch && matchesPlatform && matchesVerified;
  });

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
                <button className={`flex-shrink-0 w-14 rounded-2xl flex items-center justify-center transition-colors ${(platformFilter !== "all" || verifiedFilter !== "all") ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
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
                <p className="text-xs font-semibold text-muted-foreground px-3 py-1">{isEs ? "Verificación" : "Verification"}</p>
                {["all", "anthropic-verified", "community"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setVerifiedFilter(f)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2 ${verifiedFilter === f ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                  >
                    {f === "anthropic-verified" && <BadgeCheck className="w-3.5 h-3.5" />}
                    {f === "all" ? (isEs ? "Todos" : "All") : f === "anthropic-verified" ? "Anthropic Verified" : (isEs ? "Comunitarios" : "Community")}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </motion.div>

          {/* Platform pills */}
          <div className="flex gap-2 mb-6">
            {["all", "claude-code", "cowork"].map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${platformFilter === p ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {p === "all" ? (isEs ? "Todos" : "All") : p === "claude-code" ? "Claude Code" : "Cowork"}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((plugin, i) => (
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
                      {plugin.is_anthropic_verified ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                          <BadgeCheck className="w-3 h-3" />
                          Anthropic Verified
                        </span>
                      ) : plugin.is_official ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          {isEs ? "Oficial" : "Official"}
                        </span>
                      ) : plugin.security_status === "verified" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          {isEs ? "Verificado" : "Verified"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] font-semibold">
                           {isEs ? "Comunitario" : "Community"}
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
              ))}
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
