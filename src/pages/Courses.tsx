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

const TOOL_ORDER = ["claude", "manus", "openclaw", "lovable"];
const TOOL_LABELS: Record<string, string> = {
  claude: "Claude AI",
  manus: "Manus AI",
  openclaw: "OpenClaw",
  lovable: "Lovable",
};
const TOOL_EMOJIS: Record<string, string> = {
  claude: "🧠",
  manus: "🤖",
  openclaw: "🐙",
  lovable: "💜",
};

const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced"];

/** Detect tool from course slug */
function detectTool(slug: string): string {
  for (const t of TOOL_ORDER) {
    if (slug.startsWith(`${t}-`)) return t;
  }
  if (slug.startsWith("claude-")) return "claude";
  return "claude";
}

const Courses = () => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const { user } = useAuth();
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterTool, setFilterTool] = useState<string | null>(null);

  useSEO({
    title: isEs ? "Pymaia Academy — Cursos de IA por rol y herramienta" : "Pymaia Academy — AI Courses by Role & Tool",
    description: isEs
      ? "Aprendé a usar Claude, Manus, OpenClaw y Lovable con cursos adaptados a tu profesión y nivel."
      : "Learn Claude, Manus, OpenClaw & Lovable with courses tailored to your profession and level.",
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

  // Enrich courses with detected tool
  const enriched = courses?.map((c: any) => ({ ...c, tool: detectTool(c.slug) }));

  // Filter
  const filtered = enriched?.filter((c: any) => {
    if (filterDifficulty && c.difficulty !== filterDifficulty) return false;
    if (filterRole && c.role_slug !== filterRole) return false;
    if (filterTool && c.tool !== filterTool) return false;
    // Exclude old generic multiagent courses
    if (c.role_slug === "multiagent") return false;
    return true;
  });

  // Group: Role → Tool → Difficulty
  const grouped: Record<string, Record<string, any[]>> = {};
  for (const role of ROLE_ORDER) {
    const roleCourses = (filtered || []).filter((c: any) => c.role_slug === role);
    if (roleCourses.length === 0) continue;
    grouped[role] = {};
    for (const tool of TOOL_ORDER) {
      const toolCourses = roleCourses
        .filter((c: any) => c.tool === tool)
        .sort((a: any, b: any) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty));
      if (toolCourses.length > 0) {
        grouped[role][tool] = toolCourses;
      }
    }
  }

  const difficulties = ["beginner", "intermediate", "advanced"];
  const availableTools = [...new Set(enriched?.map((c: any) => c.tool) || [])].filter(t => TOOL_ORDER.includes(t));

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Pymaia Academy</h1>
        </div>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          {t("courses.pageSubtitle")}
        </p>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-8">
          {/* Tool filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground self-center mr-1">{isEs ? "Herramienta:" : "Tool:"}</span>
            <button
              onClick={() => setFilterTool(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filterTool ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {isEs ? "Todas" : "All"}
            </button>
            {TOOL_ORDER.filter(t => availableTools.includes(t)).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTool(filterTool === t ? null : t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterTool === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {TOOL_EMOJIS[t]} {TOOL_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Role filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground self-center mr-1">{isEs ? "Rol:" : "Role:"}</span>
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
            <span className="text-xs text-muted-foreground self-center mr-1">{isEs ? "Nivel:" : "Level:"}</span>
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

        {/* Grouped: Role → Tool → Learning Path */}
        {Object.entries(grouped).map(([role, tools]) => (
          <div key={role} className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">{ROLE_EMOJIS[role] || "📚"}</span>
              <h2 className="text-xl font-bold text-foreground">
                {t(`courses.roles.${role}`, role)}
              </h2>
            </div>

            {Object.entries(tools).map(([tool, toolCourses]) => (
              <div key={tool} className="mb-6 ml-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{TOOL_EMOJIS[tool]}</span>
                  <h3 className="text-base font-semibold text-foreground/80">
                    {TOOL_LABELS[tool]}
                  </h3>
                  <div className="flex-1 h-px bg-border ml-2" />
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:items-stretch">
                  {toolCourses.map((c: any, idx: number) => (
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
                      {idx < toolCourses.length - 1 && (
                        <div className="hidden md:flex items-center justify-center px-2">
                          <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {filtered?.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t("courses.noCourses")}</p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Courses;
