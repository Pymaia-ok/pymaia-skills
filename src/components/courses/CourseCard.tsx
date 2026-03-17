import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  slug: string;
  title: string;
  titleEs?: string | null;
  description: string;
  descriptionEs?: string | null;
  emoji: string;
  roleSlug: string;
  difficulty: string;
  estimatedMinutes: number;
  moduleCount: number;
  completedModules?: number;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const CourseCard = ({
  slug, title, titleEs, description, descriptionEs,
  emoji, roleSlug, difficulty, estimatedMinutes, moduleCount, completedModules = 0,
}: CourseCardProps) => {
  const { i18n, t } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const displayTitle = isEs && titleEs ? titleEs : title;
  const displayDesc = isEs && descriptionEs ? descriptionEs : description;
  const progress = moduleCount > 0 ? Math.round((completedModules / moduleCount) * 100) : 0;

  return (
    <Link
      to={`/curso/${slug}`}
      className="group block rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 h-full"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl sm:text-3xl shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[difficulty] || ""}`}>
              {t(`courses.difficulty.${difficulty}`)}
            </Badge>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
            {displayTitle}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{displayDesc}</p>

          <div className="flex items-center gap-3 mt-2.5 text-[11px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {moduleCount} {t("courses.modules")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {estimatedMinutes} min
            </span>
          </div>

          {completedModules > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                {progress}% {t("courses.completed")}
              </div>
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
