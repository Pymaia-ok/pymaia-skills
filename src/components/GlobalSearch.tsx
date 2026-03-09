import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Zap, Plug, Package, Loader2 } from "lucide-react";
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

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    skills: SearchResult[];
    connectors: SearchResult[];
    plugins: SearchResult[];
  }>({ skills: [], connectors: [], plugins: [] });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";

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
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const pattern = `%${query}%`;

      const [skillsRes, connectorsRes, pluginsRes] = await Promise.all([
        supabase
          .from("skills")
          .select("slug, display_name, display_name_es, tagline, tagline_es, category")
          .eq("status", "approved")
          .eq("is_public", true)
          .or(
            `display_name.ilike.${pattern},display_name_es.ilike.${pattern},tagline.ilike.${pattern},tagline_es.ilike.${pattern}`
          )
          .limit(5),
        supabase
          .from("mcp_servers")
          .select("slug, name, description, description_es, category")
          .eq("status", "approved")
          .or(
            `name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern},description_es.ilike.${pattern}`
          )
          .limit(5),
        supabase
          .from("plugins")
          .select("slug, name, name_es, description, description_es, category")
          .eq("status", "approved")
          .or(
            `name.ilike.${pattern},name_es.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern},description_es.ilike.${pattern}`
          )
          .limit(5),
      ]);

      setResults({
        skills: (skillsRes.data || []).map((s) => ({
          slug: s.slug,
          name: isEs ? s.display_name_es || s.display_name : s.display_name,
          tagline: isEs ? s.tagline_es || s.tagline : s.tagline,
          category: s.category,
          type: "skill" as const,
        })),
        connectors: (connectorsRes.data || []).map((c) => ({
          slug: c.slug,
          name: c.name,
          tagline: isEs ? c.description_es || c.description : c.description,
          category: c.category,
          type: "connector" as const,
        })),
        plugins: (pluginsRes.data || []).map((p) => ({
          slug: p.slug,
          name: isEs ? p.name_es || p.name : p.name,
          tagline: isEs ? p.description_es || p.description : p.description,
          category: p.category,
          type: "plugin" as const,
        })),
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isEs]);

  const handleSelect = useCallback(
    (type: string, slug: string) => {
      setOpen(false);
      setQuery("");
      if (type === "skill") navigate(`/skill/${slug}`);
      else if (type === "connector") navigate(`/conector/${slug}`);
      else navigate(`/plugin/${slug}`);
    },
    [navigate]
  );

  const typeIcon = {
    skill: <Zap className="w-4 h-4 text-amber-500 shrink-0" />,
    connector: <Plug className="w-4 h-4 text-blue-500 shrink-0" />,
    plugin: <Package className="w-4 h-4 text-emerald-500 shrink-0" />,
  };

  const hasResults =
    results.skills.length > 0 ||
    results.connectors.length > 0 ||
    results.plugins.length > 0;

  return (
    <>
      {/* Desktop trigger */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span>{t("search.hint")}</span>
        <kbd className="pointer-events-none ml-1 inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
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

          {!loading && query.length >= 2 && !hasResults && (
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
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
