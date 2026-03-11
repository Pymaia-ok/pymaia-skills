import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Zap, Plug, Package, Loader2, Clock, TrendingUp, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  type: "skill" | "connector" | "plugin";
}

const RECENT_KEY = "pymaia-recent-searches";
const MAX_RECENT = 5;

const POPULAR_SEARCHES = [
  { query: "GitHub", icon: "connector" as const },
  { query: "Slack", icon: "connector" as const },
  { query: "code review", icon: "skill" as const },
  { query: "SEO", icon: "skill" as const },
  { query: "Google Sheets", icon: "connector" as const },
  { query: "email automation", icon: "skill" as const },
];

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((q) => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [results, setResults] = useState<{
    skills: SearchResult[];
    connectors: SearchResult[];
    plugins: SearchResult[];
  }>({ skills: [], connectors: [], plugins: [] });
  const [aiResults, setAiResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const abortRef = useRef<AbortController | null>(null);

  // Load recents when opening
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
    } else {
      setQuery("");
      setResults({ skills: [], connectors: [], plugins: [] });
      setAiResults([]);
    }
  }, [open]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ skills: [], connectors: [], plugins: [] });
      setAiResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      setAiResults([]);
      const pattern = `%${query}%`;

      try {
        const [skillsRes, connectorsRes, pluginsRes] = await Promise.all([
          supabase
            .from("skills")
            .select("slug, display_name, display_name_es, tagline, tagline_es, category")
            .eq("status", "approved")
            .eq("is_public", true)
            .or(
              `display_name.ilike.${pattern},display_name_es.ilike.${pattern},slug.ilike.${pattern}`
            )
            .limit(5),
          supabase
            .from("mcp_servers")
            .select("slug, name, description, description_es, category")
            .eq("status", "approved")
            .or(
              `name.ilike.${pattern},slug.ilike.${pattern}`
            )
            .limit(5),
          supabase
            .from("plugins")
            .select("slug, name, name_es, description, description_es, category")
            .eq("status", "approved")
            .or(
              `name.ilike.${pattern},name_es.ilike.${pattern},slug.ilike.${pattern}`
            )
            .limit(5),
        ]);

        if (controller.signal.aborted) return;

        const skills = (skillsRes.data || []).map((s) => ({
          slug: s.slug,
          name: isEs ? s.display_name_es || s.display_name : s.display_name,
          tagline: isEs ? s.tagline_es || s.tagline : s.tagline,
          category: s.category,
          type: "skill" as const,
        }));
        const connectors = (connectorsRes.data || []).map((c) => ({
          slug: c.slug,
          name: c.name,
          tagline: isEs ? c.description_es || c.description : c.description,
          category: c.category,
          type: "connector" as const,
        }));
        const plugins = (pluginsRes.data || []).map((p) => ({
          slug: p.slug,
          name: isEs ? p.name_es || p.name : p.name,
          tagline: isEs ? p.description_es || p.description : p.description,
          category: p.category,
          type: "plugin" as const,
        }));

        setResults({ skills, connectors, plugins });
        setLoading(false);

        // If few direct results and query looks like intent (3+ chars, has space), trigger AI search
        const totalDirect = skills.length + connectors.length + plugins.length;
        if (totalDirect < 3 && query.length >= 4) {
          triggerAiSearch(query, controller.signal);
        }
      } catch {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isEs]);

  const triggerAiSearch = async (q: string, signal: AbortSignal) => {
    setAiLoading(true);
    try {
      // Use semantic search (vector embeddings) for AI-powered results
      const resp = await supabase.functions.invoke("semantic-search", {
        body: { query: q, page: 0 },
      });
      if (signal.aborted) return;
      
      // If semantic search fails, fallback to smart-search
      const searchData = resp.data?.fallback || resp.error
        ? (await supabase.functions.invoke("smart-search", { body: { query: q, page: 0 } })).data
        : resp.data;
      
      if (searchData?.data) {
        const aiSkills: SearchResult[] = (searchData.data as any[]).slice(0, 5).map((s) => ({
          slug: s.slug,
          name: isEs ? s.display_name_es || s.display_name : s.display_name,
          tagline: isEs ? s.tagline_es || s.tagline : s.tagline,
          category: s.category,
          type: "skill" as const,
        }));
        setAiResults(aiSkills);
      }
    } catch {
      // Silently fail AI search
    } finally {
      if (!signal.aborted) setAiLoading(false);
    }
  };

  const handleSelect = useCallback(
    (type: string, slug: string, name?: string) => {
      if (query) saveRecentSearch(query);
      setOpen(false);
      setQuery("");
      if (type === "skill") navigate(`/skill/${slug}`);
      else if (type === "connector") navigate(`/conector/${slug}`);
      else if (type === "plugin") navigate(`/plugin/${slug}`);
      else if (type === "recent" || type === "popular") {
        // Set query to search for it
        setQuery(name || slug);
        setOpen(true);
      }
    },
    [navigate, query]
  );

  const handleRecentClick = (q: string) => {
    setQuery(q);
  };

  const handlePopularClick = (q: string) => {
    setQuery(q);
  };

  const typeIcon = {
    skill: <Zap className="w-4 h-4 text-amber-500 shrink-0" />,
    connector: <Plug className="w-4 h-4 text-blue-500 shrink-0" />,
    plugin: <Package className="w-4 h-4 text-emerald-500 shrink-0" />,
  };

  const hasResults =
    results.skills.length > 0 ||
    results.connectors.length > 0 ||
    results.plugins.length > 0;

  const showEmptyState = !loading && query.length < 2;
  const showNoResults = !loading && !aiLoading && query.length >= 2 && !hasResults && aiResults.length === 0;
  const isSearching = query.length >= 2;

  return (
    <>
      {/* Desktop trigger */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors min-w-[220px]"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{t("search.hint")}</span>
        <kbd className="pointer-events-none ml-2 inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 text-muted-foreground hover:text-foreground"
        aria-label={t("search.placeholder")}
      >
        <Search className="w-5 h-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t("search.placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state: recent searches + popular (only when not actively searching) */}
          {showEmptyState && !isSearching && (
            <>
              {recentSearches.length > 0 && (
                <CommandGroup heading={t("search.recent")}>
                  {recentSearches.map((q) => (
                    <CommandItem
                      key={`recent-${q}`}
                      value={`recent-${q}`}
                      onSelect={() => handleRecentClick(q)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{q}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {recentSearches.length > 0 && <CommandSeparator />}
              <CommandGroup heading={t("search.popular")}>
                {POPULAR_SEARCHES.map((item) => (
                  <CommandItem
                    key={`popular-${item.query}`}
                    value={`popular-${item.query}`}
                    onSelect={() => handlePopularClick(item.query)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{item.query}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0 ml-auto">
                      {item.icon === "connector" ? t("search.connectors") : t("search.skills")}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {showNoResults && (
            <CommandEmpty>{t("search.noResults")}</CommandEmpty>
          )}

          {!loading && results.skills.length > 0 && (
            <CommandGroup heading={t("search.skills")}>
              {results.skills.map((r) => (
                <CommandItem
                  key={`skill-${r.slug}`}
                  value={`skill-${r.slug}-${r.name}`}
                  onSelect={() => handleSelect("skill", r.slug)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {typeIcon.skill}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.tagline}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {r.category}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading &&
            results.skills.length > 0 &&
            results.connectors.length > 0 && <CommandSeparator />}

          {!loading && results.connectors.length > 0 && (
            <CommandGroup heading={t("search.connectors")}>
              {results.connectors.map((r) => (
                <CommandItem
                  key={`connector-${r.slug}`}
                  value={`connector-${r.slug}-${r.name}`}
                  onSelect={() => handleSelect("connector", r.slug)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {typeIcon.connector}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.tagline}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {r.category}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading &&
            (results.connectors.length > 0 || results.skills.length > 0) &&
            results.plugins.length > 0 && <CommandSeparator />}

          {!loading && results.plugins.length > 0 && (
            <CommandGroup heading={t("search.plugins")}>
              {results.plugins.map((r) => (
                <CommandItem
                  key={`plugin-${r.slug}`}
                  value={`plugin-${r.slug}-${r.name}`}
                  onSelect={() => handleSelect("plugin", r.slug)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {typeIcon.plugin}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.tagline}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {r.category}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* AI intent results */}
          {!loading && aiResults.length > 0 && (
            <>
              {hasResults && <CommandSeparator />}
              <CommandGroup heading={t("search.aiSuggestions")}>
                {aiResults.map((r) => (
                  <CommandItem
                    key={`ai-${r.slug}`}
                    value={`ai-${r.slug}-${r.name}`}
                    onSelect={() => handleSelect("skill", r.slug)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.tagline}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {r.category}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {aiLoading && !loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              {t("search.aiSearching")}
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
