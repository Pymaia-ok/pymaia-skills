import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight } from "lucide-react";

interface ModuleRecommendationsProps {
  skillSlugs: string[];
  connectorSlugs: string[];
}

const ModuleRecommendations = ({ skillSlugs, connectorSlugs }: ModuleRecommendationsProps) => {
  const { t } = useTranslation();

  if (!skillSlugs.length && !connectorSlugs.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          {t("courses.recommendedTools")}
        </h3>
      </div>

      {skillSlugs.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Skills</p>
          <div className="flex flex-wrap gap-2">
            {skillSlugs.map((slug) => (
              <Link
                key={slug}
                to={`/skill/${slug}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {slug}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {connectorSlugs.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">{t("nav.connectors")}</p>
          <div className="flex flex-wrap gap-2">
            {connectorSlugs.map((slug) => (
              <Link
                key={slug}
                to={`/conector/${slug}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {slug}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleRecommendations;
