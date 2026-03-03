export interface Skill {
  id: string;
  slug: string;
  displayName: string;
  tagline: string;
  descriptionHuman: string;
  useCases: { title: string; before: string; after: string }[];
  targetRoles: string[];
  targetTasks: string[];
  installCommand: string;
  githubUrl: string;
  timeToInstallMinutes: number;
  installCount: number;
  avgRating: number;
  reviewCount: number;
  reviews: { author: string; role: string; timeSaved: string; comment: string; rating: number }[];
  industry: string[];
}

export const roles = [
  { id: "marketer", label: "Marketer", icon: "📣", description: "Marketing y contenido" },
  { id: "abogado", label: "Abogado", icon: "⚖️", description: "Legal y contratos" },
  { id: "consultor", label: "Consultor", icon: "💼", description: "Consultoría y estrategia" },
  { id: "founder", label: "Founder", icon: "🚀", description: "Startups y producto" },
  { id: "disenador", label: "Diseñador", icon: "🎨", description: "Diseño y creatividad" },
  { id: "otro", label: "Otro", icon: "✨", description: "Cualquier profesión" },
];

export const tasksByRole: Record<string, { id: string; label: string }[]> = {
  marketer: [
    { id: "contenido", label: "Crear contenido más rápido" },
    { id: "analizar", label: "Analizar resultados y métricas" },
    { id: "clientes", label: "Gestionar clientes" },
    { id: "reportes", label: "Preparar reportes" },
  ],
  abogado: [
    { id: "contratos", label: "Revisar contratos" },
    { id: "documentos", label: "Redactar documentos legales" },
    { id: "jurisprudencia", label: "Investigar jurisprudencia" },
    { id: "compliance", label: "Verificar compliance" },
  ],
  consultor: [
    { id: "propuestas", label: "Preparar propuestas" },
    { id: "investigacion", label: "Investigar mercados" },
    { id: "presentaciones", label: "Crear presentaciones" },
    { id: "analisis", label: "Análisis de datos" },
  ],
  founder: [
    { id: "producto", label: "Definir producto y features" },
    { id: "pitch", label: "Preparar pitch decks" },
    { id: "competencia", label: "Analizar competencia" },
    { id: "metricas", label: "Trackear métricas clave" },
  ],
  disenador: [
    { id: "briefs", label: "Generar briefs creativos" },
    { id: "copy", label: "Escribir copy para diseños" },
    { id: "feedback", label: "Estructurar feedback" },
    { id: "specs", label: "Documentar specs de diseño" },
  ],
  otro: [
    { id: "productividad", label: "Ser más productivo" },
    { id: "escritura", label: "Escribir mejor y más rápido" },
    { id: "datos", label: "Analizar datos sin Excel" },
    { id: "automatizar", label: "Automatizar tareas repetitivas" },
  ],
};

// Fallback skills data matching real ecosystem skills from skills.sh
export const skills: Skill[] = [
  {
    id: "1", slug: "find-skills", displayName: "Find Skills", tagline: "Descubre y recomienda skills relevantes del ecosistema",
    descriptionHuman: "La skill más instalada del ecosistema. Busca, filtra y recomienda Agent Skills de todo el registro global basándose en lo que necesitas hacer.",
    useCases: [], targetRoles: ["otro"], targetTasks: ["productividad"], installCommand: "npx skills add vercel-labs/skills/find-skills",
    githubUrl: "https://github.com/vercel-labs/skills", timeToInstallMinutes: 2, installCount: 388000, avgRating: 4.9, reviewCount: 0, reviews: [], industry: ["productividad", "ia"],
  },
  {
    id: "2", slug: "react-best-practices", displayName: "React Best Practices", tagline: "Aplica patrones modernos de React en tu código",
    descriptionHuman: "Guía de mejores prácticas de React por Vercel. Hooks, Server Components, patterns de composición, manejo de estado y optimización de rendimiento.",
    useCases: [], targetRoles: ["disenador", "founder"], targetTasks: ["producto"], installCommand: "npx skills add vercel-labs/agent-skills/react-best-practices",
    githubUrl: "https://github.com/vercel-labs/agent-skills", timeToInstallMinutes: 2, installCount: 186000, avgRating: 4.9, reviewCount: 0, reviews: [], industry: ["tecnologia", "frontend"],
  },
  {
    id: "3", slug: "web-design-guidelines", displayName: "Web Design Guidelines", tagline: "Principios de diseño web modernos y accesibles",
    descriptionHuman: "Guía de diseño web de Vercel. Tipografía, color, spacing, accesibilidad, responsive design y sistemas de diseño aplicados a proyectos reales.",
    useCases: [], targetRoles: ["disenador"], targetTasks: ["specs"], installCommand: "npx skills add vercel-labs/agent-skills/web-design-guidelines",
    githubUrl: "https://github.com/vercel-labs/agent-skills", timeToInstallMinutes: 2, installCount: 144000, avgRating: 4.8, reviewCount: 0, reviews: [], industry: ["diseno", "frontend"],
  },
  {
    id: "4", slug: "remotion-best-practices", displayName: "Remotion Best Practices", tagline: "Crea videos programáticos con React y Remotion",
    descriptionHuman: "Mejores prácticas de Remotion para crear videos con código. Animaciones, composiciones, audio y renderizado de video de alta calidad usando React.",
    useCases: [], targetRoles: ["disenador", "founder"], targetTasks: ["briefs"], installCommand: "npx skills add remotion-dev/skills/remotion-best-practices",
    githubUrl: "https://github.com/remotion-dev/skills", timeToInstallMinutes: 2, installCount: 122000, avgRating: 4.8, reviewCount: 0, reviews: [], industry: ["video", "creatividad"],
  },
  {
    id: "5", slug: "frontend-design", displayName: "Frontend Design", tagline: "Genera interfaces modernas con HTML, CSS y frameworks actuales",
    descriptionHuman: "Skill oficial de Anthropic para diseño frontend. Crea componentes UI profesionales, layouts responsivos y aplica mejores prácticas de diseño web moderno directamente desde Claude.",
    useCases: [], targetRoles: ["disenador", "founder"], targetTasks: ["producto", "specs"], installCommand: "npx skills add anthropics/skills/frontend-design",
    githubUrl: "https://github.com/anthropics/skills", timeToInstallMinutes: 2, installCount: 117000, avgRating: 4.8, reviewCount: 0, reviews: [], industry: ["tecnologia", "diseno"],
  },
  {
    id: "6", slug: "agent-browser", displayName: "Agent Browser", tagline: "Navega y extrae datos de la web de forma autónoma",
    descriptionHuman: "Agente de navegación web de Vercel. Permite al agente visitar URLs, interactuar con páginas, extraer datos y tomar screenshots de forma programática.",
    useCases: [], targetRoles: ["founder", "otro"], targetTasks: ["automatizar"], installCommand: "npx skills add vercel-labs/agent-browser",
    githubUrl: "https://github.com/vercel-labs/agent-browser", timeToInstallMinutes: 2, installCount: 71000, avgRating: 4.7, reviewCount: 0, reviews: [], industry: ["automatizacion", "datos"],
  },
  {
    id: "7", slug: "skill-creator", displayName: "Skill Creator", tagline: "Crea nuevas Agent Skills siguiendo el estándar SKILL.md",
    descriptionHuman: "La meta-skill de Anthropic: crea skills nuevas que otros agentes pueden usar. Genera la estructura SKILL.md, instrucciones y ejemplos para compartir en el ecosistema.",
    useCases: [], targetRoles: ["founder", "otro"], targetTasks: ["producto"], installCommand: "npx skills add anthropics/skills/skill-creator",
    githubUrl: "https://github.com/anthropics/skills", timeToInstallMinutes: 2, installCount: 58000, avgRating: 4.9, reviewCount: 0, reviews: [], industry: ["tecnologia", "ia"],
  },
  {
    id: "8", slug: "ui-ux-pro-max", displayName: "UI/UX Pro Max", tagline: "Diseña interfaces de usuario de nivel profesional",
    descriptionHuman: "Sistema completo de diseño UI/UX: wireframes, prototipos, sistemas de diseño, micro-interacciones y principios de usabilidad aplicados.",
    useCases: [], targetRoles: ["disenador"], targetTasks: ["specs", "briefs"], installCommand: "npx skills add nextlevelbuilder/ui-ux-pro-max",
    githubUrl: "https://github.com/nextlevelbuilder/ui-ux-pro-max", timeToInstallMinutes: 2, installCount: 45000, avgRating: 4.8, reviewCount: 0, reviews: [], industry: ["diseno", "ux"],
  },
  {
    id: "9", slug: "browser-use", displayName: "Browser Use", tagline: "Automatiza navegación web con agentes inteligentes",
    descriptionHuman: "Framework para automatización web con IA. El agente navega, interactúa con formularios, extrae datos y ejecuta flujos complejos en el navegador.",
    useCases: [], targetRoles: ["founder", "otro"], targetTasks: ["automatizar"], installCommand: "npx skills add browser-use/browser-use",
    githubUrl: "https://github.com/browser-use/browser-use", timeToInstallMinutes: 2, installCount: 44000, avgRating: 4.7, reviewCount: 0, reviews: [], industry: ["automatizacion", "ia"],
  },
  {
    id: "10", slug: "brainstorming", displayName: "Brainstorming", tagline: "Genera ideas creativas con frameworks de pensamiento estructurado",
    descriptionHuman: "Superpoder de Obra para sesiones de brainstorming guiadas. Usa técnicas como SCAMPER, mapas mentales y pensamiento lateral para explorar soluciones de forma sistemática.",
    useCases: [], targetRoles: ["founder", "consultor", "otro"], targetTasks: ["productividad"], installCommand: "npx skills add obra/superpowers/brainstorming",
    githubUrl: "https://github.com/anthropics/courses", timeToInstallMinutes: 2, installCount: 38000, avgRating: 4.7, reviewCount: 0, reviews: [], industry: ["estrategia", "creatividad"],
  },
];
