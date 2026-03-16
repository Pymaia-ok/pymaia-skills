import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, BookOpen, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { Badge } from "@/components/ui/badge";
import CourseModuleList from "@/components/courses/CourseModuleList";
import Footer from "@/components/landing/Footer";

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const { user } = useAuth();

  const { data: course } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      return data;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["course-modules", course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", course!.id)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: completedIds } = useQuery({
    queryKey: ["course-progress", course?.id, user?.id],
    enabled: !!course?.id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_progress")
        .select("module_id")
        .eq("course_id", course!.id)
        .eq("user_id", user!.id);
      return new Set((data ?? []).map((p: any) => p.module_id));
    },
  });

  const title = isEs && course?.title_es ? course.title_es : course?.title ?? "";
  const desc = isEs && course?.description_es ? course.description_es : course?.description ?? "";

  useSEO({
    title: `${title} — Pymaia Academy`,
    description: desc.slice(0, 160),
    canonical: `https://pymaiaskills.lovable.app/curso/${slug}`,
  });

  if (!course) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <p className="text-muted-foreground">{t("courses.notFound")}</p>
      </div>
    );
  }

  const progress = modules?.length
    ? Math.round(((completedIds?.size ?? 0) / modules.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/cursos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          {t("courses.backToCourses")}
        </Link>

        <div className="flex items-start gap-4 mb-6">
          <span className="text-5xl">{course.emoji || "📚"}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{t(`courses.difficulty.${course.difficulty}`)}</Badge>
              <Badge variant="secondary">{t(`courses.roles.${course.role_slug}`, course.role_slug)}</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-1">{desc}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{modules?.length || 0} {t("courses.modules")}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.estimated_minutes} min</span>
            </div>
          </div>
        </div>

        {progress > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{t("courses.yourProgress")}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {modules && (
          <CourseModuleList
            courseSlug={slug!}
            modules={modules}
            completedModuleIds={completedIds ?? new Set()}
          />
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CourseDetail;
