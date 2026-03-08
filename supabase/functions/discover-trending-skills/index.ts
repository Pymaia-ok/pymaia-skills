const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const githubToken = Deno.env.get("GITHUB_TOKEN");

interface TrendingSkill {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  topics: string[];
  updated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode = "trending_search", time_range = "week", language = "", limit = 20 } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (mode === "trending_search") {
      if (!githubToken) {
        throw new Error("GITHUB_TOKEN not configured");
      }

      // Búsqueda específica de Agent Skills y .cursorrules en GitHub trending
      const searches = [
        // Agent Skills oficiales
        "SKILL.md anthropic claude agent skills",
        "cursorrules claude cursor agent",
        "mcp server model context protocol",
        // Skills profesionales específicas  
        "SKILL.md legal lawyer contract review",
        "SKILL.md marketing content creation",
        "SKILL.md medical doctor healthcare",
        "SKILL.md engineering CAD BIM technical",
        // Skills trending por lenguaje/framework
        language ? `SKILL.md ${language}` : "SKILL.md react typescript nextjs",
        language ? `cursorrules ${language}` : "cursorrules javascript python"
      ];

      const trending: TrendingSkill[] = [];

      for (const searchTerm of searches) {
        try {
          const response = await fetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(searchTerm)}&sort=stars&order=desc&per_page=10`,
            {
              headers: {
                "Authorization": `Bearer ${githubToken}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Lovable-Skills-Discovery"
              }
            }
          );

          if (!response.ok) {
            console.error(`GitHub API error for "${searchTerm}":`, response.status);
            continue;
          }

          const data = await response.json();
          
          for (const repo of data.items || []) {
            // Filtrar repositorios relevantes
            if (
              repo.stargazers_count > 50 &&
              (repo.topics?.includes("claude") || 
               repo.topics?.includes("cursor") ||
               repo.topics?.includes("mcp") ||
               repo.name.toLowerCase().includes("skill") ||
               repo.description?.toLowerCase().includes("skill") ||
               repo.description?.toLowerCase().includes("cursorrules"))
            ) {
              trending.push({
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description || "",
                html_url: repo.html_url,
                stargazers_count: repo.stargazers_count,
                language: repo.language || "Unknown",
                topics: repo.topics || [],
                updated_at: repo.updated_at
              });
            }
          }

          // Rate limit: pausa entre búsquedas
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error searching "${searchTerm}":`, error);
        }
      }

      // Remover duplicados y ordenar por stars
      const uniqueTrending = trending
        .filter((skill, index, self) => 
          index === self.findIndex(s => s.full_name === skill.full_name)
        )
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, limit);

      return new Response(JSON.stringify({
        success: true,
        trending: uniqueTrending,
        total_found: uniqueTrending.length,
        searches_performed: searches.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "analyze_quality") {
      // Análisis profundo de la calidad actual por fuente
      const { data: qualityAnalysis, error } = await supabase.rpc("analyze_skill_quality");
      
      if (error) {
        console.error("Error analyzing quality:", error);
      }

      // Obtener estadísticas por fuente oficial
      const { data: sourceStats, error: sourceError } = await supabase
        .from("skills")
        .select(`
          github_url,
          install_command,
          status,
          avg_rating,
          github_stars,
          description_human,
          tagline,
          target_roles
        `)
        .eq("status", "approved")
        .or(
          "github_url.ilike.%anthropics%," +
          "github_url.ilike.%vercel%," + 
          "github_url.ilike.%openai%," +
          "install_command.ilike.%npx skills add%"
        );

      if (sourceError) throw sourceError;

      const sourceAnalysis = {
        anthropic: sourceStats?.filter(s => s.github_url?.includes("anthropics")) || [],
        vercel: sourceStats?.filter(s => s.github_url?.includes("vercel")) || [],
        openai: sourceStats?.filter(s => s.github_url?.includes("openai")) || [],
        skillssh: sourceStats?.filter(s => s.install_command?.includes("npx skills add")) || []
      };

      return new Response(JSON.stringify({
        success: true,
        analysis: {
          total_official: sourceStats?.length || 0,
          by_source: {
            anthropic: {
              count: sourceAnalysis.anthropic.length,
              avg_stars: Math.round(sourceAnalysis.anthropic.reduce((sum, s) => sum + s.github_stars, 0) / sourceAnalysis.anthropic.length || 0),
              quality_score: sourceAnalysis.anthropic.filter(s => s.description_human.length > 50 && !s.tagline.includes("Collection")).length / sourceAnalysis.anthropic.length
            },
            vercel: {
              count: sourceAnalysis.vercel.length,
              avg_stars: Math.round(sourceAnalysis.vercel.reduce((sum, s) => sum + s.github_stars, 0) / sourceAnalysis.vercel.length || 0),
              quality_score: sourceAnalysis.vercel.filter(s => s.description_human.length > 50 && !s.tagline.includes("Collection")).length / sourceAnalysis.vercel.length
            },
            openai: {
              count: sourceAnalysis.openai.length,
              avg_stars: Math.round(sourceAnalysis.openai.reduce((sum, s) => sum + s.github_stars, 0) / sourceAnalysis.openai.length || 0),
              quality_score: sourceAnalysis.openai.filter(s => s.description_human.length > 50 && !s.tagline.includes("Collection")).length / sourceAnalysis.openai.length
            },
            skillssh: {
              count: sourceAnalysis.skillssh.length,
              avg_stars: Math.round(sourceAnalysis.skillssh.reduce((sum, s) => sum + s.github_stars, 0) / sourceAnalysis.skillssh.length || 0),
              quality_score: sourceAnalysis.skillssh.filter(s => s.description_human.length > 50 && !s.tagline.includes("Collection")).length / sourceAnalysis.skillssh.length
            }
          }
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "create_role_bundles") {
      // Crear/mejorar bundles por rol usando las mejores skills oficiales
      const roleBundles = [
        {
          role_slug: "marketer",
          title: "Marketing Pro Pack",
          title_es: "Pack Marketing Profesional", 
          description: "Essential AI tools for content creation, campaign planning, and brand management",
          description_es: "Herramientas IA esenciales para creación de contenido, planificación de campañas y gestión de marca",
          hero_emoji: "📣",
          target_skills: [
            "anthropics/skills/brand-voice",
            "anthropics/skills/content-creation", 
            "vercel-labs/skills/json-render-image",
            "anthropics/skills/campaign-planning"
          ]
        },
        {
          role_slug: "founder",
          title: "Startup Founder Toolkit", 
          title_es: "Kit de Herramientas para Founders",
          description: "Strategic tools for product development, financial analysis, and business planning",
          description_es: "Herramientas estratégicas para desarrollo de producto, análisis financiero y planificación empresarial",
          hero_emoji: "🚀",
          target_skills: [
            "anthropics/skills/financial-statements",
            "anthropics/skills/scientific-problem-selection",
            "vercel-labs/skills/deploy-vercel",
            "anthropics/skills/brainstorming"
          ]
        },
        {
          role_slug: "disenador", 
          title: "Design System Pro",
          title_es: "Sistema de Diseño Profesional",
          description: "Complete design workflow from wireframes to production-ready components",
          description_es: "Flujo completo de diseño desde wireframes hasta componentes listos para producción", 
          hero_emoji: "🎨",
          target_skills: [
            "anthropics/skills/frontend-design",
            "anthropics/skills/canvas-design",
            "vercel-labs/skills/web-design-guidelines",
            "vercel-labs/skills/building-components"
          ]
        },
        {
          role_slug: "abogado",
          title: "Legal Practice Suite",
          title_es: "Suite de Práctica Legal", 
          description: "Streamline contract review, compliance checks, and legal research",
          description_es: "Optimiza revisión de contratos, verificación de cumplimiento e investigación legal",
          hero_emoji: "⚖️",
          target_skills: [
            "anthropics/skills/contract-review",
            "anthropics/skills/compliance", 
            "anthropics/skills/legal-risk-assessment"
          ]
        },
        {
          role_slug: "consultor",
          title: "Business Consultant Pro",
          title_es: "Consultor de Negocios Pro",
          description: "Data analysis, client research, and strategic planning tools",
          description_es: "Herramientas de análisis de datos, investigación de clientes y planificación estratégica",
          hero_emoji: "💼", 
          target_skills: [
            "anthropics/skills/xlsx-creator",
            "anthropics/skills/customer-research",
            "anthropics/skills/executive-briefing",
            "anthropics/skills/metrics-tracking"
          ]
        }
      ];

      // Insertar/actualizar bundles
      for (const bundle of roleBundles) {
        const { error } = await supabase
          .from("skill_bundles")
          .upsert({
            role_slug: bundle.role_slug,
            title: bundle.title,
            title_es: bundle.title_es,
            description: bundle.description,
            description_es: bundle.description_es, 
            hero_emoji: bundle.hero_emoji,
            skill_slugs: bundle.target_skills,
            is_active: true
          }, { 
            onConflict: "role_slug",
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`Error updating bundle for ${bundle.role_slug}:`, error);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        bundles_created: roleBundles.length,
        roles: roleBundles.map(b => b.role_slug)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Mode not supported");

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});