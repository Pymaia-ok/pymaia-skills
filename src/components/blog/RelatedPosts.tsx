import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Clock, Shield, Zap, Server, Building2 } from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  security: <Shield className="h-3.5 w-3.5" />,
  productivity: <Zap className="h-3.5 w-3.5" />,
  mcp: <Server className="h-3.5 w-3.5" />,
  industry: <Building2 className="h-3.5 w-3.5" />,
};

interface RelatedPostsProps {
  currentSlug: string;
  category: string;
  isEs: boolean;
}

export default function RelatedPosts({ currentSlug, category, isEs }: RelatedPostsProps) {
  const { data: posts } = useQuery({
    queryKey: ["blog-related", currentSlug, category],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("blog_posts")
        .select("slug, title, title_es, excerpt, excerpt_es, category, reading_time_minutes, cover_image_url, created_at")
        .eq("status", "published")
        .neq("slug", currentSlug)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-border">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {isEs ? "Artículos relacionados" : "Related Articles"}
      </h2>
      <div className="grid md:grid-cols-3 gap-5">
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
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {categoryIcons[post.category]}
                    {post.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {post.reading_time_minutes} min
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary/80 transition-colors line-clamp-2">
                  {isEs ? post.title_es || post.title : post.title}
                </h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
