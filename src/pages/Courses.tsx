import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import CourseCard from "@/components/courses/CourseCard";
import Footer from "@/components/landing/Footer";

const Courses = () => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const { user } = useAuth();
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);

  useSEO({
    title: isEs ? "Pymaia Academy — Cursos gratuitos de Claude por rol" : "Pymaia Academy — Free Claude Courses by Role",
    description: isEs
      ? "Aprendé a usar Claude desde cero hasta experto con cursos adaptados a tu profesión."
      : "Learn Claude from zero to expert with courses tailored to your profession.",
    canonical: "https://pymaiaskills.lovable.app/cursos",
  });

  const { data: courses } = useQuery({
    queryKey: ["courses-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: progressMap } = useQuery({
    queryKey: ["course-progress-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_progress")
        .select("course_id, module_id")
        .eq("user_id", user!.id);
      const map: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        map[p.course_id] = (map[p.course_id] || 0) + 1;
      });
      return map;
    },
  });

  const filtered = filterDifficulty
    ? courses?.filter((c: any) => c.difficulty === filterDifficulty)
    : courses;

  const difficulties = ["beginner", "intermediate", "advanced"];

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Pymaia Academy</h1>
        </div>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          {t("courses.pageSubtitle")}
        </p>

        {/* Difficulty filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setFilterDifficulty(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !filterDifficulty ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("courses.allLevels")}
          </button>
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDifficulty(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterDifficulty === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`courses.difficulty.${d}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered?.map((c: any) => (
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
              completedModules={progressMap?.[c.id] || 0}
            />
          ))}
        </div>

        {filtered?.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t("courses.noCourses")}</p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Courses;
