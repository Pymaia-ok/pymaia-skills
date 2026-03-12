import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import BlogArticle from "@/components/blog/BlogArticle";
import BlogSidebar from "@/components/blog/BlogSidebar";
import BlogCTA from "@/components/blog/BlogCTA";
import RelatedPosts from "@/components/blog/RelatedPosts";

const GEO_REGION_MAP: Record<string, string> = {
  latam: "419",
  global: "",
  us: "US",
  es: "ES",
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
  const baseUrl = "https://pymaiaskills.lovable.app";
  const postUrl = `${baseUrl}/blog/${slug}`;

  // Build JSON-LD schemas
  const jsonLdSchemas: Record<string, unknown>[] = [];

  // Article schema
  if (post) {
    jsonLdSchemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: metaDesc,
      image: post.cover_image_url ? (post.cover_image_url.startsWith("http") ? post.cover_image_url : `${baseUrl}${post.cover_image_url}`) : undefined,
      datePublished: post.created_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: "Pymaia" },
      publisher: {
        "@type": "Organization",
        name: "Pymaia Skills",
        logo: { "@type": "ImageObject", url: `${baseUrl}/images/pymaia-skills-icon.png` },
      },
      mainEntityOfPage: postUrl,
      keywords: (post.keywords || []).join(", "),
      inLanguage: isEs ? "es" : "en",
    });

    // BreadcrumbList schema
    jsonLdSchemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl}/blog` },
        { "@type": "ListItem", position: 3, name: post.category, item: `${baseUrl}/blog?cat=${post.category}` },
        { "@type": "ListItem", position: 4, name: title },
      ],
    });

    // FAQPage schema from faq_json
    const faqItems = post.faq_json || [];
    if (faqItems.length > 0) {
      jsonLdSchemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((faq: { question: string; answer: string }) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      });
    }
  }

  const geoRegion = post?.geo_target ? GEO_REGION_MAP[post.geo_target] || "" : "";

  useSEO({
    title: title ? `${title}` : "Blog — Pymaia Skills",
    description: metaDesc || "",
    canonical: postUrl,
    jsonLd: jsonLdSchemas.length > 0 ? jsonLdSchemas : undefined,
    hreflang: post ? {
      en: postUrl,
      es: postUrl,
    } : undefined,
    geoRegion: geoRegion || undefined,
    aiDescription: metaDesc || undefined,
    aiContentType: "article",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-64 w-full bg-muted animate-pulse rounded-lg mb-6" />
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
          <div className="flex-1 max-w-3xl">
            <BlogArticle post={post} title={title} content={content} isEs={isEs} />
            <BlogCTA isEs={isEs} />
            <RelatedPosts currentSlug={post.slug} category={post.category} isEs={isEs} />
          </div>
          <BlogSidebar relatedSkills={relatedSkills} isEs={isEs} />
        </div>
      </div>
    </div>
  );
}
