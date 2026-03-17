import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { GraduationCap, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import CourseCard from "@/components/courses/CourseCard";
import Footer from "@/components/landing/Footer";

const ROLE_ORDER = ["marketer", "abogado", "founder", "consultor"];
const ROLE_EMOJIS: Record<string, string> = {
  marketer: "📣",
  abogado: "⚖️",
  founder: "🚀",
  consultor: "💼",
};
const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced"];

const Courses = () => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const { user } = useAuth();
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);

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

  // Filter courses
  const filtered = courses?.filter((c: any) => {
    if (filterDifficulty && c.difficulty !== filterDifficulty) return false;
    if (filterRole && c.role_slug !== filterRole) return false;
    return true;
  });

  // Group by role
  const groupedByRole: Record<string, any[]> = {};
  for (const role of ROLE_ORDER) {
    const roleCourses = (filtered || []).filter((c: any) => c.role_slug === role);
    if (roleCourses.length > 0) {
      // Sort by difficulty order
      roleCourses.sort((a: any, b: any) =>
        DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty)
      );
      groupedByRole[role] = roleCourses;
    }
  }
  // Catch any roles not in ROLE_ORDER
  const otherCourses = (filtered || []).filter((c: any) => !ROLE_ORDER.includes(c.role_slug));
  if (otherCourses.length > 0) groupedByRole["general"] = otherCourses;

  const difficulties = ["beginner", "intermediate", "advanced"];
  const hasRoleFilter = !filterRole;

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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Role filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterRole(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filterRole ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("courses.allRoles")}
            </button>
            {ROLE_ORDER.map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(filterRole === r ? null : r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterRole === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {ROLE_EMOJIS[r]} {t(`courses.roles.${r}`, r)}
              </button>
            ))}
          </div>

          {/* Difficulty filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterDifficulty(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filterDifficulty ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("courses.allLevels")}
            </button>
            {difficulties.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterDifficulty === d ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`courses.difficulty.${d}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Grouped by role */}
        {hasRoleFilter ? (
          Object.entries(groupedByRole).map(([role, roleCourses]) => (
            <div key={role} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{ROLE_EMOJIS[role] || "📚"}</span>
                <h2 className="text-xl font-semibold text-foreground">
                  {t(`courses.roles.${role}`, role)}
                </h2>
              </div>

              {/* Learning path: horizontal on md+, vertical on mobile */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:items-stretch">
                {roleCourses.map((c: any, idx: number) => (
                  <div key={c.id} className="flex flex-col md:flex-row md:items-center flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <CourseCard
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
                    </div>
                    {idx < roleCourses.length - 1 && (
                      <div className="hidden md:flex items-center justify-center px-2">
                        <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          /* Single role selected: simple grid */
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
        )}

        {filtered?.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t("courses.noCourses")}</p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Courses;
