import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ModuleQuiz from "@/components/courses/ModuleQuiz";
import ModuleRecommendations from "@/components/courses/ModuleRecommendations";
import RichModuleContent from "@/components/courses/RichModuleContent";

const CourseModule = () => {
  const { slug, moduleOrder } = useParams<{ slug: string; moduleOrder: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const order = parseInt(moduleOrder || "0", 10);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("slug", slug).single();
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

  const currentModule = modules?.find((m: any) => m.sort_order === order);
  const currentIdx = modules?.findIndex((m: any) => m.sort_order === order) ?? -1;
  const prevModule = currentIdx > 0 ? modules?.[currentIdx - 1] : null;
  const nextModule = currentIdx >= 0 && currentIdx < (modules?.length ?? 0) - 1 ? modules?.[currentIdx + 1] : null;

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

  const isCompleted = currentModule ? completedIds?.has(currentModule.id) : false;
  const overallProgress = modules?.length
    ? Math.round(((completedIds?.size ?? 0) / modules.length) * 100)
    : 0;

  const completeMutation = useMutation({
    mutationFn: async (quizScore?: number) => {
      if (!user || !currentModule || !course) return;
      await supabase.from("course_progress").upsert({
        user_id: user.id,
        course_id: course.id,
        module_id: currentModule.id,
        quiz_score: quizScore ?? null,
      } as any, { onConflict: "user_id,module_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
    },
  });

  const title = isEs && currentModule?.title_es ? currentModule.title_es : currentModule?.title ?? "";
  const content = isEs && currentModule?.content_md_es ? currentModule.content_md_es : currentModule?.content_md ?? "";
  const quizQuestions = (currentModule?.quiz_json as any[]) || [];
  const courseTitle = isEs && course?.title_es ? course.title_es : course?.title ?? "";

  useSEO({
    title: `${title} — ${courseTitle} — Pymaia Academy`,
    description: title,
  });

  if (courseLoading || !modules) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
          <div className="h-4 w-40 bg-secondary animate-pulse rounded" />
          <div className="h-8 w-72 bg-secondary animate-pulse rounded" />
          <div className="h-2 w-full bg-secondary animate-pulse rounded-full" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-secondary animate-pulse rounded" style={{ width: `${90 - i * 8}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentModule) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <p className="text-muted-foreground">{t("courses.moduleNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 flex-wrap">
          <Link to="/cursos" className="hover:text-foreground transition-colors">Academy</Link>
          <span>/</span>
          <Link to={`/curso/${slug}`} className="hover:text-foreground transition-colors">{courseTitle}</Link>
          <span>/</span>
          <span className="text-foreground">{t("courses.module")} {currentIdx + 1}</span>
        </div>

        {/* Overall progress bar */}
        {user && overallProgress > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{t("courses.courseProgress")}</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-1.5" />
          </div>
        )}

        {/* Module header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
              {currentIdx + 1}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("courses.module")} {currentIdx + 1} {t("courses.of")} {modules?.length ?? 0}
            </span>
            {currentModule.estimated_minutes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {currentModule.estimated_minutes} min
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("courses.completed")}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
        </div>

        {/* Rich interactive content */}
        <RichModuleContent markdown={content} />

        {/* Quiz */}
        {quizQuestions.length > 0 && (
          <div className="my-10">
            <ModuleQuiz
              questions={quizQuestions}
              onComplete={(score) => completeMutation.mutate(score)}
            />
          </div>
        )}

        {/* Recommendations */}
        <div className="my-8">
          <ModuleRecommendations
            skillSlugs={currentModule.recommended_skill_slugs || []}
            connectorSlugs={currentModule.recommended_connector_slugs || []}
          />
        </div>

        {/* Mark complete (if no quiz) */}
        {quizQuestions.length === 0 && !isCompleted && user && (
          <div className="my-8 flex justify-center">
            <Button
              onClick={() => completeMutation.mutate(undefined)}
              className="gap-2"
              size="lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              {t("courses.markComplete")}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center border-t border-border pt-6 mt-10">
          {prevModule ? (
            <Link
              to={`/curso/${slug}/${prevModule.sort_order}`}
              className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <div className="text-left">
                <span className="text-xs block">{t("courses.previous")}</span>
                <span className="text-foreground text-sm font-medium hidden sm:block">
                  {isEs && prevModule.title_es ? prevModule.title_es : prevModule.title}
                </span>
              </div>
            </Link>
          ) : <div />}
          {nextModule ? (
            <Link
              to={`/curso/${slug}/${nextModule.sort_order}`}
              className="group flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors text-right"
            >
              <div>
                <span className="text-xs text-muted-foreground block">{t("courses.next")}</span>
                <span className="text-sm font-medium hidden sm:block">
                  {isEs && nextModule.title_es ? nextModule.title_es : nextModule.title}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link
              to={`/curso/${slug}`}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              {t("courses.backToCourse")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseModule;
