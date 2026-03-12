import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Calendar, Shield, Zap, Server, Building2 } from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  productivity: <Zap className="h-4 w-4" />,
  mcp: <Server className="h-4 w-4" />,
  industry: <Building2 className="h-4 w-4" />,
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Increment view count
  useQuery({
    queryKey: ["blog-view", slug],
    queryFn: async () => {
      await (supabase as any).rpc("increment_blog_view", { _slug: slug }).catch(() => {});
      return true;
    },
    enabled: !!slug && !!post,
    staleTime: Infinity,
  });

  // Related skills sidebar
  const { data: relatedSkills } = useQuery({
    queryKey: ["blog-related-skills", post?.related_skill_slugs],
    queryFn: async () => {
      if (!post?.related_skill_slugs?.length) return [];
      const { data } = await supabase
        .from("skills")
        .select("slug, display_name, display_name_es, tagline, tagline_es")
        .in("slug", post.related_skill_slugs)
        .eq("status", "approved")
        .limit(5);
      return data || [];
    },
    enabled: !!post?.related_skill_slugs?.length,
  });

  const title = isEs ? post?.title_es || post?.title : post?.title;
  const content = isEs ? post?.content_es || post?.content : post?.content;
  const metaDesc = isEs ? post?.meta_description_es || post?.meta_description : post?.meta_description;

  useSEO({
    title: title ? `${title}` : "Blog — Pymaia Skills",
    description: metaDesc || "",
    canonical: `https://pymaiaskills.lovable.app/blog/${slug}`,
    jsonLd: post ? {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: metaDesc,
      datePublished: post.created_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: "Pymaia" },
      publisher: {
        "@type": "Organization",
        name: "Pymaia Skills",
        logo: { "@type": "ImageObject", url: "https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" },
      },
      mainEntityOfPage: `https://pymaiaskills.lovable.app/blog/${slug}`,
      keywords: (post.keywords || []).join(", "),
    } : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-12 w-full bg-muted animate-pulse rounded mb-6" />
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-muted animate-pulse rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? "Artículo no encontrado" : "Article not found"}
          </h1>
          <Link to="/blog">
            <Button variant="outline">{isEs ? "Volver al blog" : "Back to blog"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main article */}
          <article className="flex-1 max-w-3xl">
            <Link to="/blog">
              <Button variant="ghost" size="sm" className="mb-6 gap-1 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> {isEs ? "Blog" : "Blog"}
              </Button>
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="gap-1">
                {categoryIcons[post.category]}
                {post.category}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {post.reading_time_minutes} min
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.created_at).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
              {title}
            </h1>

            {post.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-8">
                {post.keywords.map((kw: string) => (
                  <span key={kw} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => {
                    const isInternal = href?.startsWith("/");
                    if (isInternal) {
                      return <Link to={href!} className="text-primary underline">{children}</Link>;
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                  },
                }}
              >
                {content || ""}
              </ReactMarkdown>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className="sticky top-24 space-y-6">
              {relatedSkills && relatedSkills.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                      {isEs ? "Skills relacionados" : "Related Skills"}
                    </h3>
                    <div className="space-y-3">
                      {relatedSkills.map((skill: any) => (
                        <Link
                          key={skill.slug}
                          to={`/skill/${skill.slug}`}
                          className="block group"
                        >
                          <p className="text-sm font-medium text-foreground group-hover:text-primary/80 transition-colors">
                            {isEs ? skill.display_name_es || skill.display_name : skill.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {isEs ? skill.tagline_es || skill.tagline : skill.tagline}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-2 text-sm">
                    {isEs ? "Explorá más" : "Explore More"}
                  </h3>
                  <div className="space-y-2">
                    <Link to="/explorar" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                      → {isEs ? "Catálogo de soluciones" : "Solutions catalog"}
                    </Link>
                    <Link to="/conectores" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                      → {isEs ? "Conectores MCP" : "MCP Connectors"}
                    </Link>
                    <Link to="/seguridad" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                      → {isEs ? "Avisos de seguridad" : "Security Advisories"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
