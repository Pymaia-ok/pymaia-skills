import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, Clock, ChevronRight } from "lucide-react";

interface Module {
  id: string;
  sort_order: number;
  title: string;
  title_es?: string | null;
  estimated_minutes: number;
}

interface CourseModuleListProps {
  courseSlug: string;
  modules: Module[];
  completedModuleIds: Set<string>;
}

const CourseModuleList = ({ courseSlug, modules, completedModuleIds }: CourseModuleListProps) => {
  const { i18n, t } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  return (
    <div className="space-y-2">
      {modules.map((mod, idx) => {
        const done = completedModuleIds.has(mod.id);
        const displayTitle = isEs && mod.title_es ? mod.title_es : mod.title;
        return (
          <Link
            key={mod.id}
            to={`/curso/${courseSlug}/${mod.sort_order}`}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all group hover:border-primary/30 hover:bg-secondary/30 ${
              done ? "border-primary/20 bg-primary/5" : "border-border"
            }`}
          >
            {done ? (
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${done ? "text-foreground" : "text-foreground"}`}>
                {idx + 1}. {displayTitle}
              </p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                {mod.estimated_minutes} min
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </Link>
        );
      })}
    </div>
  );
};

export default CourseModuleList;
