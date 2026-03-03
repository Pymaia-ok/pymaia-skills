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

export const skills: Skill[] = [
  {
    id: "1",
    slug: "brief-generator",
    displayName: "Brief Generator",
    tagline: "Generá briefs de campaña en 3 minutos, no en 3 horas",
    descriptionHuman: "Esta skill le enseña a Claude exactamente cómo crear briefs de campaña profesionales. Solo contale qué cliente es, qué objetivo tiene la campaña y qué canales vas a usar — Claude hace el resto.",
    useCases: [
      { title: "Brief de campaña", before: "3 horas armando un brief desde cero", after: "3 minutos con toda la estructura lista" },
      { title: "Brief de contenido", before: "Ida y vuelta interminable con el equipo", after: "Un brief claro que todos entienden a la primera" },
      { title: "Brief para influencer", before: "Copiar y pegar de templates viejos", after: "Brief personalizado por marca e influencer" },
    ],
    targetRoles: ["marketer", "consultor"],
    targetTasks: ["contenido", "propuestas", "briefs"],
    installCommand: "npx skills add brief-generator",
    githubUrl: "https://github.com/skills/brief-generator",
    timeToInstallMinutes: 2,
    installCount: 1243,
    avgRating: 4.9,
    reviewCount: 89,
    reviews: [
      { author: "María López", role: "Marketing Manager", timeSaved: "3 horas por semana", comment: "Antes tardaba toda una mañana en un brief. Ahora lo tengo en minutos y es mejor que lo que hacía yo.", rating: 5 },
      { author: "Carlos Ruiz", role: "Director de Agencia", timeSaved: "5 horas por semana", comment: "Mi equipo entero la usa. Los briefs son más consistentes y los clientes notan la diferencia.", rating: 5 },
    ],
    industry: ["Agencias", "Startups"],
  },
  {
    id: "2",
    slug: "contract-reviewer",
    displayName: "Contract Reviewer",
    tagline: "Revisá contratos en minutos y encontrá lo que importa",
    descriptionHuman: "Claude analiza cualquier contrato, identifica cláusulas de riesgo, compara contra estándares de la industria y te da un resumen ejecutivo claro.",
    useCases: [
      { title: "Revisión de NDA", before: "45 minutos leyendo cada cláusula", after: "5 minutos con resumen de riesgos" },
      { title: "Contratos de servicio", before: "Depender siempre del abogado externo", after: "Primera revisión instantánea en casa" },
      { title: "Contratos laborales", before: "Templates genéricos sin personalizar", after: "Análisis contra mejores prácticas" },
    ],
    targetRoles: ["abogado", "founder", "consultor"],
    targetTasks: ["contratos", "compliance", "documentos"],
    installCommand: "npx skills add contract-reviewer",
    githubUrl: "https://github.com/skills/contract-reviewer",
    timeToInstallMinutes: 2,
    installCount: 892,
    avgRating: 4.8,
    reviewCount: 56,
    reviews: [
      { author: "Ana Martínez", role: "Abogada corporativa", timeSaved: "4 horas por semana", comment: "No reemplaza la revisión legal final, pero la primera pasada la hace en segundos. Increíble.", rating: 5 },
    ],
    industry: ["Legal", "Startups"],
  },
  {
    id: "3",
    slug: "seo-content-optimizer",
    displayName: "SEO Content Optimizer",
    tagline: "Escribí contenido que rankea sin ser experto en SEO",
    descriptionHuman: "Esta skill analiza tu contenido, sugiere mejoras de SEO en lenguaje simple y te da un score de optimización. Sin jerga técnica.",
    useCases: [
      { title: "Blog posts", before: "Publicar y rezar para que rankee", after: "Contenido optimizado antes de publicar" },
      { title: "Landing pages", before: "Pagar a un consultor SEO", after: "Optimización en tiempo real mientras escribís" },
      { title: "Descripciones de producto", before: "Copy genérico sin estrategia", after: "Copy optimizado para búsqueda y conversión" },
    ],
    targetRoles: ["marketer", "founder"],
    targetTasks: ["contenido", "analizar"],
    installCommand: "npx skills add seo-content-optimizer",
    githubUrl: "https://github.com/skills/seo-content-optimizer",
    timeToInstallMinutes: 2,
    installCount: 2100,
    avgRating: 4.7,
    reviewCount: 134,
    reviews: [
      { author: "Diego Fernández", role: "Content Manager", timeSaved: "2 horas por semana", comment: "Nuestro tráfico orgánico subió 40% en 2 meses desde que la usamos.", rating: 5 },
    ],
    industry: ["Agencias", "E-commerce"],
  },
  {
    id: "4",
    slug: "proposal-builder",
    displayName: "Proposal Builder",
    tagline: "Armá propuestas comerciales que ganan clientes",
    descriptionHuman: "Transformá tus notas sueltas en propuestas profesionales. Claude estructura, redacta y formatea la propuesta completa.",
    useCases: [
      { title: "Propuestas de proyecto", before: "Un día entero armando la propuesta", after: "30 minutos con propuesta profesional" },
      { title: "Cotizaciones", before: "Excel desordenado sin contexto", after: "Cotización con justificación de valor" },
      { title: "Respuesta a licitaciones", before: "Semana de trabajo del equipo", after: "Draft completo en horas" },
    ],
    targetRoles: ["consultor", "founder", "marketer"],
    targetTasks: ["propuestas", "clientes", "pitch"],
    installCommand: "npx skills add proposal-builder",
    githubUrl: "https://github.com/skills/proposal-builder",
    timeToInstallMinutes: 3,
    installCount: 1567,
    avgRating: 4.9,
    reviewCount: 78,
    reviews: [
      { author: "Laura Sánchez", role: "Consultora Senior", timeSaved: "6 horas por semana", comment: "Ganamos 3 clientes nuevos el primer mes. Las propuestas son otro nivel.", rating: 5 },
    ],
    industry: ["Consultoras", "Agencias"],
  },
  {
    id: "5",
    slug: "data-storyteller",
    displayName: "Data Storyteller",
    tagline: "Convertí datos aburridos en historias que convencen",
    descriptionHuman: "Subí un CSV o pegá datos y Claude te genera un reporte visual con insights, tendencias y recomendaciones accionables. Sin tocar Excel.",
    useCases: [
      { title: "Reportes mensuales", before: "Horas en Excel haciendo gráficos", after: "Reporte con insights en 10 minutos" },
      { title: "Presentaciones a clientes", before: "Datos crudos sin contexto", after: "Historia de datos que el cliente entiende" },
      { title: "Análisis de métricas", before: "No saber qué significan los números", after: "Insights claros con recomendaciones" },
    ],
    targetRoles: ["marketer", "consultor", "founder"],
    targetTasks: ["reportes", "analizar", "analisis", "datos", "metricas"],
    installCommand: "npx skills add data-storyteller",
    githubUrl: "https://github.com/skills/data-storyteller",
    timeToInstallMinutes: 2,
    installCount: 1890,
    avgRating: 4.8,
    reviewCount: 112,
    reviews: [
      { author: "Martín Gómez", role: "Founder", timeSaved: "3 horas por semana", comment: "Mis inversores ahora entienden las métricas. Antes les mandaba screenshots de dashboards.", rating: 5 },
    ],
    industry: ["Startups", "Consultoras", "Agencias"],
  },
  {
    id: "6",
    slug: "email-crafter",
    displayName: "Email Crafter",
    tagline: "Emails que abren, leen y responden",
    descriptionHuman: "Claude escribe emails profesionales adaptados al tono, contexto y objetivo. Desde cold emails hasta seguimientos a clientes.",
    useCases: [
      { title: "Cold emails", before: "Templates genéricos que nadie abre", after: "Emails personalizados con alto open rate" },
      { title: "Follow-ups", before: "No saber qué escribir sin ser pesado", after: "Seguimientos naturales y efectivos" },
      { title: "Comunicación interna", before: "Emails largos que nadie lee", after: "Mensajes claros y accionables" },
    ],
    targetRoles: ["marketer", "founder", "consultor"],
    targetTasks: ["clientes", "contenido", "productividad"],
    installCommand: "npx skills add email-crafter",
    githubUrl: "https://github.com/skills/email-crafter",
    timeToInstallMinutes: 2,
    installCount: 3200,
    avgRating: 4.6,
    reviewCount: 201,
    reviews: [
      { author: "Sofía Torres", role: "Account Manager", timeSaved: "2 horas por semana", comment: "Mi tasa de respuesta subió de 15% a 40%. Los emails suenan naturales, no robóticos.", rating: 4 },
    ],
    industry: ["Agencias", "Startups", "Consultoras"],
  },
  {
    id: "7",
    slug: "pitch-deck-writer",
    displayName: "Pitch Deck Writer",
    tagline: "Creá pitch decks que consiguen inversión",
    descriptionHuman: "Contale a Claude sobre tu startup y te genera el contenido completo del pitch deck con la estructura que los inversores esperan.",
    useCases: [
      { title: "Pitch para inversores", before: "Semanas iterando slides sin dirección", after: "Estructura y contenido listos en 1 hora" },
      { title: "Demo days", before: "Presentación genérica sin punch", after: "Narrative compelling con datos" },
      { title: "Pitch de ventas", before: "Improvisar en cada reunión", after: "Deck adaptado por tipo de cliente" },
    ],
    targetRoles: ["founder"],
    targetTasks: ["pitch", "producto"],
    installCommand: "npx skills add pitch-deck-writer",
    githubUrl: "https://github.com/skills/pitch-deck-writer",
    timeToInstallMinutes: 3,
    installCount: 980,
    avgRating: 4.9,
    reviewCount: 45,
    reviews: [
      { author: "Pablo Herrera", role: "CEO & Founder", timeSaved: "8 horas por proyecto", comment: "Levantamos nuestra ronda seed con el pitch que generamos con esta skill. Game changer.", rating: 5 },
    ],
    industry: ["Startups"],
  },
  {
    id: "8",
    slug: "social-media-planner",
    displayName: "Social Media Planner",
    tagline: "Planificá un mes de redes sociales en 30 minutos",
    descriptionHuman: "Claude genera un calendario de contenido completo con ideas, copies y hashtags adaptados a tu marca y audiencia.",
    useCases: [
      { title: "Calendario mensual", before: "Improvisar posts cada día", after: "Un mes planificado en 30 minutos" },
      { title: "Copies para redes", before: "Bloqueo creativo constante", after: "Variantes de copy listas para publicar" },
      { title: "Estrategia de hashtags", before: "Usar los mismos hashtags siempre", after: "Hashtags investigados por nicho" },
    ],
    targetRoles: ["marketer", "founder", "disenador"],
    targetTasks: ["contenido", "productividad", "briefs"],
    installCommand: "npx skills add social-media-planner",
    githubUrl: "https://github.com/skills/social-media-planner",
    timeToInstallMinutes: 2,
    installCount: 2800,
    avgRating: 4.7,
    reviewCount: 167,
    reviews: [
      { author: "Valentina Cruz", role: "Social Media Manager", timeSaved: "5 horas por semana", comment: "Pasé de planificar 1 día entero a hacerlo en la pausa del almuerzo. Y el contenido es mejor.", rating: 5 },
    ],
    industry: ["Agencias", "E-commerce", "Startups"],
  },
  {
    id: "9",
    slug: "legal-document-drafter",
    displayName: "Legal Document Drafter",
    tagline: "Redactá documentos legales con estructura profesional",
    descriptionHuman: "Claude genera borradores de documentos legales siguiendo las mejores prácticas. Desde cartas documento hasta términos y condiciones.",
    useCases: [
      { title: "Términos y condiciones", before: "Copiar de otro sitio y cruzar los dedos", after: "T&C personalizados a tu negocio" },
      { title: "Cartas documento", before: "2 horas de redacción formal", after: "Borrador profesional en minutos" },
      { title: "Políticas de privacidad", before: "Template genérico de internet", after: "Política adaptada a tu jurisdicción" },
    ],
    targetRoles: ["abogado", "founder"],
    targetTasks: ["documentos", "compliance", "productividad"],
    installCommand: "npx skills add legal-document-drafter",
    githubUrl: "https://github.com/skills/legal-document-drafter",
    timeToInstallMinutes: 2,
    installCount: 670,
    avgRating: 4.6,
    reviewCount: 34,
    reviews: [
      { author: "Roberto Álvarez", role: "Abogado independiente", timeSaved: "4 horas por semana", comment: "El borrador inicial es sorprendentemente bueno. Solo ajusto detalles específicos del caso.", rating: 4 },
    ],
    industry: ["Legal"],
  },
  {
    id: "10",
    slug: "competitor-analyzer",
    displayName: "Competitor Analyzer",
    tagline: "Entendé a tu competencia sin contratar un analista",
    descriptionHuman: "Dále a Claude la URL de tu competidor y te genera un análisis completo: posicionamiento, fortalezas, debilidades y oportunidades.",
    useCases: [
      { title: "Análisis de competencia", before: "Semanas de research manual", after: "Análisis estructurado en 1 hora" },
      { title: "Benchmarking", before: "Comparaciones subjetivas sin datos", after: "Benchmark objetivo con framework" },
      { title: "Oportunidades de mercado", before: "Intuición sin validación", after: "Gaps identificados con evidencia" },
    ],
    targetRoles: ["founder", "consultor", "marketer"],
    targetTasks: ["competencia", "investigacion", "analisis"],
    installCommand: "npx skills add competitor-analyzer",
    githubUrl: "https://github.com/skills/competitor-analyzer",
    timeToInstallMinutes: 2,
    installCount: 1450,
    avgRating: 4.7,
    reviewCount: 82,
    reviews: [
      { author: "Camila Rodríguez", role: "Head of Strategy", timeSaved: "3 horas por semana", comment: "Lo uso antes de cada reunión de estrategia. Llegamos con análisis que antes tardábamos días.", rating: 5 },
    ],
    industry: ["Startups", "Consultoras"],
  },
  {
    id: "11",
    slug: "meeting-summarizer",
    displayName: "Meeting Summarizer",
    tagline: "Nunca más pierdas lo importante de una reunión",
    descriptionHuman: "Pegá la transcripción de cualquier reunión y Claude genera un resumen ejecutivo con decisiones, action items y responsables.",
    useCases: [
      { title: "Reuniones de equipo", before: "Notas desordenadas que nadie revisa", after: "Resumen con action items claros" },
      { title: "Calls con clientes", before: "Olvidar compromisos importantes", after: "Follow-up automático con todo lo acordado" },
      { title: "Board meetings", before: "Actas que tardan días en escribir", after: "Acta profesional en 5 minutos" },
    ],
    targetRoles: ["consultor", "founder", "marketer", "otro"],
    targetTasks: ["productividad", "clientes", "automatizar"],
    installCommand: "npx skills add meeting-summarizer",
    githubUrl: "https://github.com/skills/meeting-summarizer",
    timeToInstallMinutes: 2,
    installCount: 4200,
    avgRating: 4.8,
    reviewCount: 234,
    reviews: [
      { author: "Fernando Díaz", role: "Project Manager", timeSaved: "5 horas por semana", comment: "Lo uso en cada reunión. El equipo recibe el resumen 5 minutos después de que terminamos.", rating: 5 },
    ],
    industry: ["Consultoras", "Agencias", "Startups"],
  },
  {
    id: "12",
    slug: "design-spec-writer",
    displayName: "Design Spec Writer",
    tagline: "Documentá tus diseños sin sufrir",
    descriptionHuman: "Claude genera specs de diseño completas a partir de tu descripción. Incluye user flows, componentes, estados y edge cases.",
    useCases: [
      { title: "Specs para desarrollo", before: "El dev no entiende el Figma", after: "Spec clara que el dev puede seguir" },
      { title: "Design systems", before: "Documentación desactualizada", after: "Docs autogeneradas desde el diseño" },
      { title: "User flows", before: "Dibujos en servilleta", after: "Flows documentados con decisiones" },
    ],
    targetRoles: ["disenador", "founder"],
    targetTasks: ["specs", "feedback", "producto"],
    installCommand: "npx skills add design-spec-writer",
    githubUrl: "https://github.com/skills/design-spec-writer",
    timeToInstallMinutes: 2,
    installCount: 780,
    avgRating: 4.5,
    reviewCount: 42,
    reviews: [
      { author: "Lucía Vega", role: "Product Designer", timeSaved: "3 horas por semana", comment: "Los devs agradecen las specs. Y yo agradezco no tener que escribirlas manualmente.", rating: 5 },
    ],
    industry: ["Startups"],
  },
];

export function getSkillsByRoleAndTask(role: string, task: string): Skill[] {
  return skills
    .filter(s => s.targetRoles.includes(role) && s.targetTasks.includes(task))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5);
}

export function getSkillBySlug(slug: string): Skill | undefined {
  return skills.find(s => s.slug === slug);
}

export const industries = ["Agencias", "Legal", "Consultoras", "E-commerce", "Startups", "Educación", "Finanzas"];
