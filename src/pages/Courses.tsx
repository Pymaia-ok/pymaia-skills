import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { GraduationCap, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import CourseCard from "@/components/courses/CourseCard";
import Footer from "@/components/landing/Footer";

const ROLE_ORDER = ["marketer", "abogado", "founder", "consultor", "disenador", "rrhh", "contabilidad", "finanzas", "operaciones", "ventas"];
const ROLE_EMOJIS: Record<string, string> = {
  marketer: "📣",
  abogado: "⚖️",
  founder: "🚀",
  consultor: "💼",
  disenador: "🎨",
  rrhh: "👥",
  contabilidad: "📊",
  finanzas: "💰",
  operaciones: "⚙️",
  ventas: "🤝",
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

function detectTool(slug: string): string {
  for (const t of TOOL_ORDER) {
    if (slug.startsWith(`${t}-`)) return t;
  }
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

  const enriched = courses?.map((c: any) => ({ ...c, tool: detectTool(c.slug) }));

  const filtered = enriched?.filter((c: any) => {
    if (filterDifficulty && c.difficulty !== filterDifficulty) return false;
    if (filterRole && c.role_slug !== filterRole) return false;
    if (filterTool && c.tool !== filterTool) return false;
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

  const FilterChip = ({
    active,
    onClick,
    children,
    variant = "primary",
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    variant?: "primary" | "accent";
  }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? variant === "accent"
            ? "bg-accent text-accent-foreground"
            : "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Pymaia Academy</h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-2xl">
          {isEs
            ? "Dominá las herramientas de IA con cursos diseñados para tu rol profesional y nivel."
            : "Master AI tools with courses designed for your professional role and level."}
        </p>

        {/* Filters */}
        <div className="flex flex-col gap-2.5 mb-6 sm:mb-8">
          {/* Tool filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-muted-foreground shrink-0">{isEs ? "Herramienta:" : "Tool:"}</span>
            <div className="flex gap-1.5">
              <FilterChip active={!filterTool} onClick={() => setFilterTool(null)}>
                {isEs ? "Todas" : "All"}
              </FilterChip>
              {TOOL_ORDER.filter(t => availableTools.includes(t)).map((tool) => (
                <FilterChip
                  key={tool}
                  active={filterTool === tool}
                  onClick={() => setFilterTool(filterTool === tool ? null : tool)}
                >
                  {TOOL_EMOJIS[tool]} {TOOL_LABELS[tool]}
                </FilterChip>
              ))}
            </div>
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-muted-foreground shrink-0">{isEs ? "Rol:" : "Role:"}</span>
            <div className="flex gap-1.5">
              <FilterChip active={!filterRole} onClick={() => setFilterRole(null)}>
                {t("courses.allRoles")}
              </FilterChip>
              {ROLE_ORDER.map((r) => (
                <FilterChip
                  key={r}
                  active={filterRole === r}
                  onClick={() => setFilterRole(filterRole === r ? null : r)}
                >
                  {ROLE_EMOJIS[r]} {t(`courses.roles.${r}`, r)}
                </FilterChip>
              ))}
            </div>
          </div>

          {/* Difficulty filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-muted-foreground shrink-0">{isEs ? "Nivel:" : "Level:"}</span>
            <div className="flex gap-1.5">
              <FilterChip active={!filterDifficulty} onClick={() => setFilterDifficulty(null)} variant="accent">
                {t("courses.allLevels")}
              </FilterChip>
              {difficulties.map((d) => (
                <FilterChip
                  key={d}
                  active={filterDifficulty === d}
                  onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d)}
                  variant="accent"
                >
                  {t(`courses.difficulty.${d}`)}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        {/* Grouped: Role → Tool → Learning Path */}
        {Object.entries(grouped).map(([role, tools]) => (
          <div key={role} className="mb-10 sm:mb-12">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <span className="text-xl sm:text-2xl">{ROLE_EMOJIS[role] || "📚"}</span>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {t(`courses.roles.${role}`, role)}
              </h2>
            </div>

            {Object.entries(tools).map(([tool, toolCourses]) => (
              <div key={tool} className="mb-5 sm:mb-6 sm:ml-2">
                <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                  <span className="text-base sm:text-lg">{TOOL_EMOJIS[tool]}</span>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground/80">
                    {TOOL_LABELS[tool]}
                  </h3>
                  <div className="flex-1 h-px bg-border ml-2" />
                </div>

                {/* Mobile: vertical stack. Tablet+: horizontal path with chevrons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {toolCourses.map((c: any, idx: number) => (
                    <div key={c.id} className="relative">
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
                      {/* Chevron connector on lg+ */}
                      {idx < toolCourses.length - 1 && (
                        <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                          <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
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
