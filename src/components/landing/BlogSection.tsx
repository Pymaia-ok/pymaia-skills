import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Clock, Shield, Zap, Server, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const categoryIcons: Record<string, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  productivity: <Zap className="h-4 w-4" />,
  mcp: <Server className="h-4 w-4" />,
  industry: <Building2 className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  security: "bg-destructive/10 text-destructive",
  productivity: "bg-primary/10 text-primary",
  mcp: "bg-accent text-accent-foreground",
  industry: "bg-secondary text-secondary-foreground",
};

export default function BlogSection() {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  const { data: posts } = useQuery({
    queryKey: ["blog-latest"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("slug, title, title_es, excerpt, excerpt_es, category, reading_time_minutes, created_at, keywords, cover_image_url")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              {isEs ? "Últimos artículos" : "Latest Articles"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isEs
                ? "Insights sobre seguridad, productividad y el ecosistema de agentes IA"
                : "Insights on security, productivity, and the AI agent ecosystem"}
            </p>
          </div>
          <Link to="/blog">
            <Button variant="ghost" className="gap-2">
              {isEs ? "Ver todos" : "View all"} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post: any) => (
            <Link key={post.slug} to={`/blog/${post.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow border-border/50 group overflow-hidden">
                {post.cover_image_url && (
                  <AspectRatio ratio={16 / 9}>
                    <img
                      src={post.cover_image_url}
                      alt={isEs ? post.title_es || post.title : post.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </AspectRatio>
                )}
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className={`gap-1 text-xs ${categoryColors[post.category] || ""}`}>
                      {categoryIcons[post.category]}
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.reading_time_minutes} min
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary/80 transition-colors mb-2 line-clamp-2">
                    {isEs ? post.title_es || post.title : post.title}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                    {isEs ? post.excerpt_es || post.excerpt : post.excerpt}
                  </p>

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
      </div>
    </section>
  );
}
