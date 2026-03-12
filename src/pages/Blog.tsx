import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Shield, Zap, Server, Building2, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { key: "all", label_en: "All", label_es: "Todos" },
  { key: "security", label_en: "Security", label_es: "Seguridad" },
  { key: "productivity", label_en: "Productivity", label_es: "Productividad" },
  { key: "mcp", label_en: "MCP", label_es: "MCP" },
  { key: "industry", label_en: "Industry", label_es: "Industria" },
];

const categoryIcons: Record<string, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  productivity: <Zap className="h-4 w-4" />,
  mcp: <Server className="h-4 w-4" />,
  industry: <Building2 className="h-4 w-4" />,
};

const PAGE_SIZE = 12;

export default function Blog() {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);

  useSEO({
    title: isEs ? "Blog — Pymaia Skills" : "Blog — Pymaia Skills",
    description: isEs
      ? "Artículos sobre seguridad de agentes IA, productividad con IA y el ecosistema MCP. Guías, mejores prácticas y tendencias."
      : "Articles on AI agent security, AI productivity, and the MCP ecosystem. Guides, best practices, and trends.",
    canonical: "https://pymaiaskills.lovable.app/blog",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["blog-list", category, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from("blog_posts")
        .select("slug, title, title_es, excerpt, excerpt_es, category, reading_time_minutes, created_at, keywords, geo_target", { count: "estimated" })
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (category !== "all") query = query.eq("category", category);

      const { data, error, count } = await query;
      if (error) throw error;
      return { posts: data as any[], count: count ?? 0 };
    },
  });

  const posts = data?.posts || [];
  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {isEs ? "Blog" : "Blog"}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
          {isEs
            ? "Guías, mejores prácticas y tendencias sobre seguridad de agentes IA, productividad y el ecosistema MCP."
            : "Guides, best practices, and trends on AI agent security, productivity, and the MCP ecosystem."}
        </p>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.key}
              variant={category === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => { setCategory(cat.key); setPage(0); }}
              className="gap-1"
            >
              {categoryIcons[cat.key]}
              {isEs ? cat.label_es : cat.label_en}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">
            {isEs ? "Aún no hay artículos en esta categoría." : "No articles in this category yet."}
          </p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post: any) => (
                <Link key={post.slug} to={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-md transition-shadow border-border/50 group">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          {categoryIcons[post.category]}
                          {post.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {post.reading_time_minutes} min
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-foreground group-hover:text-primary/80 transition-colors mb-3 line-clamp-2">
                        {isEs ? post.title_es || post.title : post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                        {isEs ? post.excerpt_es || post.excerpt : post.excerpt}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1">
                        {(post.keywords || []).slice(0, 3).map((kw: string) => (
                          <span key={kw} className="text-xs text-muted-foreground/70 bg-muted px-2 py-0.5 rounded">{kw}</span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(post.created_at).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
