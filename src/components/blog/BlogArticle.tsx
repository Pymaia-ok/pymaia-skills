import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Calendar, Shield, Zap, Server, Building2, Bot, User } from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  productivity: <Zap className="h-4 w-4" />,
  agents: <Bot className="h-4 w-4" />,
  mcp: <Server className="h-4 w-4" />,
  industry: <Building2 className="h-4 w-4" />,
};

interface BlogArticleProps {
  post: any;
  title: string;
  content: string;
  isEs: boolean;
}

export default function BlogArticle({ post, title, content, isEs }: BlogArticleProps) {
  return (
    <article className="flex-1 max-w-3xl">
      <Link to="/blog">
        <Button variant="ghost" size="sm" className="mb-6 gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Blog
        </Button>
      </Link>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
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

      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
        {title}
      </h1>

      {/* Author byline */}
      <div className="flex items-center gap-2 mb-6 pb-6 border-b border-border">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Pymaia Team</p>
          <p className="text-xs text-muted-foreground">
            {isEs ? "Equipo de seguridad e investigación" : "Security & Research Team"}
          </p>
        </div>
      </div>

      {post.cover_image_url && (
        <div className="rounded-lg overflow-hidden mb-8">
          <img
            src={post.cover_image_url}
            alt={title}
            className="w-full h-auto object-cover max-h-[400px]"
            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
          />
        </div>
      )}

      {post.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {post.keywords.map((kw: string) => (
            <span key={kw} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
              {kw}
            </span>
          ))}
        </div>
      )}

      <div className="prose max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // Strip any h1 from content — the title is already rendered above
            h1: ({ children }) => <h2 className="text-2xl font-bold mt-10 mb-4 text-foreground">{children}</h2>,
            a: ({ href, children }) => {
              const isInternal = href?.startsWith("/");
              if (isInternal) {
                return <Link to={href!} className="text-primary underline hover:text-primary/80">{children}</Link>;
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{children}</a>;
            },
          }}
        >
          {content || ""}
        </ReactMarkdown>
      </div>
    </article>
  );
}
