import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

interface BlogCTAProps {
  isEs: boolean;
}

export default function BlogCTA({ isEs }: BlogCTAProps) {
  return (
    <div className="mt-12 p-6 md:p-8 rounded-xl bg-primary/5 border border-primary/10">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {isEs
              ? "Protegé tus flujos de trabajo con agentes IA verificados"
              : "Protect your workflows with verified AI agents"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isEs
              ? "Explorá nuestro catálogo de skills con Trust Score, auditorías de seguridad y reviews de la comunidad."
              : "Explore our catalog of skills with Trust Score, security audits, and community reviews."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/explorar">
              <Button size="sm" className="gap-1">
                {isEs ? "Explorar skills" : "Explore skills"} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            <Link to="/conectores">
              <Button variant="outline" size="sm" className="gap-1">
                {isEs ? "Ver conectores MCP" : "View MCP connectors"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
