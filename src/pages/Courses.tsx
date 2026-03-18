import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { GraduationCap, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import CourseCard from "@/components/courses/CourseCard";
import Footer from "@/components/landing/Footer";

const ROLE_ORDER = ["marketer", "abogado", "founder", "consultor", "disenador", "rrhh", "contabilidad", "finanzas", "operaciones", "ventas"];
const ROLE_EMOJIS: Record<string, string> = {
  marketer: "📣", abogado: "⚖️", founder: "🚀", consultor: "💼",
  disenador: "🎨", rrhh: "👥", contabilidad: "📊", finanzas: "💰",
  operaciones: "⚙️", ventas: "🤝",
};

const TOOL_ORDER = ["claude", "manus", "openclaw", "lovable"];
const TOOL_LABELS: Record<string, string> = {
  claude: "Claude AI", manus: "Manus AI", openclaw: "OpenClaw", lovable: "Lovable",
};
const TOOL_EMOJIS: Record<string, string> = {
  claude: "🧠", manus: "🤖", openclaw: "🐙", lovable: "💜",
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

  const hasActiveFilters = filterTool || filterRole || filterDifficulty;

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
        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 mb-8 sm:mb-10 space-y-3">
          {/* Tool filter */}
          <FilterRow label={isEs ? "Herramienta" : "Tool"}>
            <Chip active={!filterTool} onClick={() => setFilterTool(null)}>
              {isEs ? "Todas" : "All"}
            </Chip>
            {TOOL_ORDER.filter(t => availableTools.includes(t)).map((tool) => (
              <Chip key={tool} active={filterTool === tool} onClick={() => setFilterTool(filterTool === tool ? null : tool)}>
                {TOOL_EMOJIS[tool]} {TOOL_LABELS[tool]}
              </Chip>
            ))}
          </FilterRow>

          {/* Role filter */}
          <FilterRow label={isEs ? "Rol" : "Role"}>
            <Chip active={!filterRole} onClick={() => setFilterRole(null)}>
              {t("courses.allRoles")}
            </Chip>
            {ROLE_ORDER.map((r) => (
              <Chip key={r} active={filterRole === r} onClick={() => setFilterRole(filterRole === r ? null : r)}>
                {ROLE_EMOJIS[r]} {t(`courses.roles.${r}`, r)}
              </Chip>
            ))}
          </FilterRow>

          {/* Difficulty filter */}
          <FilterRow label={isEs ? "Nivel" : "Level"}>
            <Chip active={!filterDifficulty} onClick={() => setFilterDifficulty(null)} variant="accent">
              {t("courses.allLevels")}
            </Chip>
            {difficulties.map((d) => (
              <Chip key={d} active={filterDifficulty === d} onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d)} variant="accent">
                {t(`courses.difficulty.${d}`)}
              </Chip>
            ))}
          </FilterRow>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <span className="text-[11px] text-muted-foreground">{filtered?.length ?? 0} {isEs ? "cursos" : "courses"}</span>
              <button
                onClick={() => { setFilterTool(null); setFilterRole(null); setFilterDifficulty(null); }}
                className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
                {isEs ? "Limpiar filtros" : "Clear filters"}
              </button>
            </div>
          )}
        </div>

        {/* Grouped: Role → Tool → Learning Path */}
        {Object.entries(grouped).map(([role, tools]) => (
          <div key={role} className="mb-10 sm:mb-12">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <span className="text-xl sm:text-2xl">{ROLE_EMOJIS[role] || "📚"}</span>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {t(`courses.roles.${role}`, role)}
              </h2>
              <div className="flex-1 h-px bg-border ml-2" />
            </div>

            {Object.entries(tools).map(([tool, toolCourses]) => (
              <div key={tool} className="mb-5 sm:mb-6 sm:ml-2">
                <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                  <span className="text-base sm:text-lg">{TOOL_EMOJIS[tool]}</span>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground/80">
                    {TOOL_LABELS[tool]}
                  </h3>
                </div>

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

/* ---- Sub-components ---- */

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1.5 w-20 text-right">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
}

function Chip({
  active, onClick, children, variant = "primary",
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; variant?: "primary" | "accent";
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active
          ? variant === "accent"
            ? "bg-accent text-accent-foreground shadow-sm"
            : "bg-primary text-primary-foreground shadow-sm"
          : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default Courses;
