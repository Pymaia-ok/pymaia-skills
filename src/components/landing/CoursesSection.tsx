import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CourseCard from "@/components/courses/CourseCard";

const CoursesSection = () => {
  const { t } = useTranslation();

  const { data: courses } = useQuery({
    queryKey: ["courses-landing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("created_at")
        .limit(4);
      return data ?? [];
    },
  });

  if (!courses?.length) return null;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t("courses.sectionTitle")}
          </h2>
        </div>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          {t("courses.sectionSubtitle")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c: any) => (
            <CourseCard
              key={c.id}
              slug={c.slug}
              title={c.title}
              titleEs={c.title_es}
              description={c.description}
              descriptionEs={c.description_es}
              emoji={c.emoji || "📚"}
              roleSlug={c.role_slug}
              difficulty={c.difficulty}
              estimatedMinutes={c.estimated_minutes}
              moduleCount={c.module_count}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/cursos"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {t("courses.viewAll")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
