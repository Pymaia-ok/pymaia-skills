// generate-bundles — Auto-generate skill bundles for all roles
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Role → categories mapping + connector/plugin keywords
const ROLE_CONFIG: Record<string, {
  categories: string[];
  connectorKeywords: string[];
  pluginKeywords: string[];
  emoji: string;
  description: string;
  description_es: string;
}> = {
  developer: {
    categories: ["desarrollo", "productividad"],
    connectorKeywords: ["github", "gitlab", "playwright", "docker", "terminal"],
    pluginKeywords: ["code review", "typescript", "lsp", "superpowers", "frontend"],
    emoji: "💻",
    description: "Essential tools for software developers: code review, testing, deployment, and productivity",
    description_es: "Herramientas esenciales para desarrolladores: revisión de código, testing, deployment y productividad",
  },
  marketer: {
    categories: ["marketing", "ventas", "creatividad"],
    connectorKeywords: ["social", "analytics", "email", "seo", "ads"],
    pluginKeywords: ["marketing", "copywriting", "seo", "content"],
    emoji: "📈",
    description: "Marketing toolkit: SEO, content creation, social media, analytics, and campaign management",
    description_es: "Kit de marketing: SEO, creación de contenido, redes sociales, analítica y gestión de campañas",
  },
  designer: {
    categories: ["diseño", "creatividad"],
    connectorKeywords: ["figma", "design", "image", "svg", "canva"],
    pluginKeywords: ["frontend design", "ui", "css", "component"],
    emoji: "🎨",
    description: "Design toolkit: UI/UX design, prototyping, design systems, and visual creation",
    description_es: "Kit de diseño: UI/UX, prototipado, sistemas de diseño y creación visual",
  },
  "data-analyst": {
    categories: ["datos", "ia"],
    connectorKeywords: ["postgres", "sqlite", "database", "mongo", "redis"],
    pluginKeywords: ["data", "sql", "analytics", "visualization"],
    emoji: "📊",
    description: "Data analysis toolkit: databases, SQL, visualization, ML models, and data pipelines",
    description_es: "Kit de análisis de datos: bases de datos, SQL, visualización, modelos ML y pipelines",
  },
  founder: {
    categories: ["negocios", "producto", "ventas", "marketing"],
    connectorKeywords: ["notion", "slack", "stripe", "calendar"],
    pluginKeywords: ["business", "pitch", "strategy", "productivity"],
    emoji: "🚀",
    description: "Founder toolkit: business strategy, product management, sales, and growth tools",
    description_es: "Kit de fundador: estrategia de negocio, gestión de producto, ventas y crecimiento",
  },
  devops: {
    categories: ["operaciones", "automatizacion", "desarrollo"],
    connectorKeywords: ["docker", "kubernetes", "aws", "terraform", "monitoring"],
    pluginKeywords: ["deploy", "ci", "infrastructure", "cloud"],
    emoji: "⚙️",
    description: "DevOps toolkit: CI/CD, infrastructure, monitoring, containers, and cloud deployment",
    description_es: "Kit DevOps: CI/CD, infraestructura, monitoreo, contenedores y despliegue en la nube",
  },
  lawyer: {
    categories: ["legal"],
    connectorKeywords: ["document", "pdf", "drive", "notion"],
    pluginKeywords: ["legal", "contract", "document", "compliance"],
    emoji: "⚖️",
    description: "Legal toolkit: contract analysis, compliance checking, document management",
    description_es: "Kit legal: análisis de contratos, verificación de cumplimiento, gestión documental",
  },
  "product-manager": {
    categories: ["producto", "negocios", "datos"],
    connectorKeywords: ["jira", "linear", "notion", "trello", "asana"],
    pluginKeywords: ["product", "roadmap", "sprint", "user story"],
    emoji: "📋",
    description: "Product management toolkit: roadmaps, specs, user stories, analytics",
    description_es: "Kit de gestión de producto: roadmaps, specs, historias de usuario, analítica",
  },
  sales: {
    categories: ["ventas", "marketing"],
    connectorKeywords: ["crm", "email", "hubspot", "salesforce", "linkedin"],
    pluginKeywords: ["sales", "outbound", "lead", "prospect"],
    emoji: "🤝",
    description: "Sales toolkit: CRM, prospecting, cold outreach, lead generation",
    description_es: "Kit de ventas: CRM, prospección, outreach, generación de leads",
  },
  hr: {
    categories: ["rrhh", "negocios"],
    connectorKeywords: ["calendar", "slack", "email", "notion"],
    pluginKeywords: ["hr", "recruiting", "onboarding", "employee"],
    emoji: "👥",
    description: "HR toolkit: recruiting, onboarding, performance reviews, employee management",
    description_es: "Kit de RRHH: reclutamiento, onboarding, evaluaciones, gestión de empleados",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let generated = 0;
    for (const [role, config] of Object.entries(ROLE_CONFIG)) {
      try {
        // Get top skills by quality_rank in relevant categories
        const { data: topSkills } = await supabase
          .from("skills")
          .select("slug, display_name, quality_rank")
          .eq("status", "approved")
          .in("category", config.categories)
          .gt("quality_rank", 0.2)
          .order("quality_rank", { ascending: false })
          .limit(8);

        const skillSlugs = (topSkills || []).map((s: any) => s.slug);

        // Get relevant connectors by keyword search
        const connectorSlugs: string[] = [];
        for (const kw of config.connectorKeywords.slice(0, 3)) {
          const { data: conns } = await supabase
            .from("mcp_servers")
            .select("slug")
            .eq("status", "approved")
            .or(`name.ilike.%${kw}%,description.ilike.%${kw}%`)
            .order("install_count", { ascending: false })
            .limit(2);
          for (const c of conns || []) {
            if (!connectorSlugs.includes(c.slug)) connectorSlugs.push(c.slug);
          }
        }

        // Get relevant plugins
        const pluginSlugs: string[] = [];
        for (const kw of config.pluginKeywords.slice(0, 3)) {
          const { data: plugs } = await supabase
            .from("plugins")
            .select("slug")
            .eq("status", "approved")
            .or(`name.ilike.%${kw}%,description.ilike.%${kw}%`)
            .order("install_count", { ascending: false })
            .limit(2);
          for (const p of plugs || []) {
            if (!pluginSlugs.includes(p.slug)) pluginSlugs.push(p.slug);
          }
        }

        const totalItems = skillSlugs.length + connectorSlugs.length + pluginSlugs.length;
        const title = `${role.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} Toolkit`;

        // Upsert bundle
        await supabase.from("skill_bundles").upsert({
          role_slug: role,
          title,
          title_es: `Kit de ${role.replace(/-/g, " ")}`,
          description: config.description,
          description_es: config.description_es,
          hero_emoji: config.emoji,
          skill_slugs: skillSlugs,
          connector_slugs: connectorSlugs.slice(0, 5),
          plugin_slugs: pluginSlugs.slice(0, 5),
          total_items: totalItems,
          auto_generated: true,
          is_active: true,
          last_regenerated_at: new Date().toISOString(),
        }, { onConflict: "role_slug" });

        generated++;
        console.log(`✅ Bundle "${role}": ${skillSlugs.length} skills, ${connectorSlugs.length} connectors, ${pluginSlugs.length} plugins`);
      } catch (e) {
        console.error(`Error generating bundle for ${role}:`, (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ success: true, generated, total: Object.keys(ROLE_CONFIG).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-bundles error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
