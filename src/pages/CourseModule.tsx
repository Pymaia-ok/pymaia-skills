import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import ModuleQuiz from "@/components/courses/ModuleQuiz";
import ModuleRecommendations from "@/components/courses/ModuleRecommendations";

const CourseModule = () => {
  const { slug, moduleOrder } = useParams<{ slug: string; moduleOrder: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const order = parseInt(moduleOrder || "0", 10);

  const { data: course } = useQuery({
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

  const { data: isCompleted } = useQuery({
    queryKey: ["module-completed", currentModule?.id, user?.id],
    enabled: !!currentModule?.id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_progress")
        .select("id")
        .eq("module_id", currentModule!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["module-completed"] });
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
    },
  });

  const title = isEs && currentModule?.title_es ? currentModule.title_es : currentModule?.title ?? "";
  const content = isEs && currentModule?.content_md_es ? currentModule.content_md_es : currentModule?.content_md ?? "";
  const quizQuestions = (currentModule?.quiz_json as any[]) || [];

  useSEO({
    title: `${title} — Pymaia Academy`,
    description: title,
  });

  if (!currentModule) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <p className="text-muted-foreground">{t("courses.moduleNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to={`/curso/${slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          {t("courses.backToCourse")}
        </Link>

        <div className="mb-8">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("courses.module")} {currentIdx + 1}/{modules?.length ?? 0}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">{title}</h1>
        </div>

        {/* Content */}
        <div
          className="prose prose-neutral dark:prose-invert max-w-none mb-10"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />

        {/* Quiz */}
        {quizQuestions.length > 0 && (
          <div className="mb-8">
            <ModuleQuiz
              questions={quizQuestions}
              onComplete={(score) => completeMutation.mutate(score)}
            />
          </div>
        )}

        {/* Recommendations */}
        <div className="mb-8">
          <ModuleRecommendations
            skillSlugs={currentModule.recommended_skill_slugs || []}
            connectorSlugs={currentModule.recommended_connector_slugs || []}
          />
        </div>

        {/* Mark complete (if no quiz) */}
        {quizQuestions.length === 0 && !isCompleted && user && (
          <div className="mb-8">
            <Button onClick={() => completeMutation.mutate()} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t("courses.markComplete")}
            </Button>
          </div>
        )}

        {isCompleted && (
          <p className="text-sm text-primary flex items-center gap-1 mb-8">
            <CheckCircle2 className="w-4 h-4" />
            {t("courses.alreadyCompleted")}
          </p>
        )}

        {/* Navigation */}
        <div className="flex justify-between border-t border-border pt-6">
          {prevModule ? (
            <Link to={`/curso/${slug}/${prevModule.sort_order}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              {t("courses.previous")}
            </Link>
          ) : <div />}
          {nextModule ? (
            <Link to={`/curso/${slug}/${nextModule.sort_order}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              {t("courses.next")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to={`/curso/${slug}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              {t("courses.backToCourse")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple markdown to HTML (basic: headers, bold, code, lists, paragraphs)
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hupol])(.+)$/gm, "<p>$1</p>");
}

export default CourseModule;
