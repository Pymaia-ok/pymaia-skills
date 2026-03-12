import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

interface BlogSidebarProps {
  relatedSkills: any[] | undefined;
  isEs: boolean;
}

export default function BlogSidebar({ relatedSkills, isEs }: BlogSidebarProps) {
  return (
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

        {/* Newsletter CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                {isEs ? "¿Te interesa la seguridad IA?" : "Interested in AI Security?"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {isEs
                ? "Explorá nuestro catálogo de skills verificados para agentes IA."
                : "Explore our catalog of verified skills for AI agents."}
            </p>
            <Link to="/explorar">
              <Button size="sm" className="w-full gap-1">
                {isEs ? "Explorar catálogo" : "Explore catalog"} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

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
  );
}
