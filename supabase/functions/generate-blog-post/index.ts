import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOPIC_POOL = [
  // Security
  { category: "security", keywords: ["seguridad agentes IA", "AI agent security", "MCP security"], geo: "global", topic_en: "How to evaluate the security of AI agents before deploying them in your organization", topic_es: "Cómo evaluar la seguridad de agentes de IA antes de implementarlos en tu organización" },
  { category: "security", keywords: ["prompt injection", "inyección de prompts", "AI vulnerabilities"], geo: "global", topic_en: "Understanding prompt injection attacks and how to protect your AI workflows", topic_es: "Entendiendo los ataques de inyección de prompts y cómo proteger tus flujos de IA" },
  { category: "security", keywords: ["MCP server security", "seguridad servidor MCP", "tool permissions"], geo: "global", topic_en: "MCP Server security best practices: permissions, scopes, and auditing", topic_es: "Mejores prácticas de seguridad en servidores MCP: permisos, scopes y auditoría" },
  { category: "security", keywords: ["typosquatting AI", "supply chain AI", "cadena de suministro IA"], geo: "global", topic_en: "Typosquatting in AI tool ecosystems: a growing supply chain threat", topic_es: "Typosquatting en ecosistemas de herramientas IA: una amenaza creciente en la cadena de suministro" },
  { category: "security", keywords: ["trust score AI", "puntuación confianza IA", "AI tool verification"], geo: "global", topic_en: "What is a Trust Score and why it matters when choosing AI tools", topic_es: "Qué es un Trust Score y por qué importa al elegir herramientas de IA" },
  { category: "security", keywords: ["hidden content attacks", "ataques contenido oculto", "zero-width characters"], geo: "global", topic_en: "Hidden content attacks in AI tools: zero-width characters, base64, and homoglyphs", topic_es: "Ataques de contenido oculto en herramientas IA: caracteres de ancho cero, base64 y homoglifos" },
  { category: "security", keywords: ["AI compliance LATAM", "cumplimiento IA Latinoamérica", "regulación IA"], geo: "latam", topic_en: "AI compliance landscape in Latin America: what businesses need to know in 2026", topic_es: "Panorama de cumplimiento de IA en Latinoamérica: lo que las empresas necesitan saber en 2026" },
  { category: "security", keywords: ["secret scanning AI", "escaneo de secretos IA", "API key leaks"], geo: "global", topic_en: "Why secret scanning is critical for AI tool marketplaces", topic_es: "Por qué el escaneo de secretos es crítico para marketplaces de herramientas IA" },
  { category: "security", keywords: ["dependency audit AI", "auditoría dependencias IA", "CVE vulnerabilities"], geo: "global", topic_en: "Automated dependency auditing for AI tools: catching CVEs before they reach production", topic_es: "Auditoría automatizada de dependencias para herramientas IA: detectando CVEs antes de producción" },
  { category: "security", keywords: ["AI security incident response", "respuesta incidentes seguridad IA"], geo: "global", topic_en: "Building an incident response plan for AI tool security breaches", topic_es: "Construyendo un plan de respuesta a incidentes para brechas de seguridad en herramientas IA" },

  // Productivity
  { category: "productivity", keywords: ["productividad IA empresas", "AI productivity business", "automatización tareas"], geo: "global", topic_en: "10 ways AI agents are transforming daily business operations in 2026", topic_es: "10 formas en que los agentes de IA están transformando las operaciones diarias de negocio en 2026" },
  { category: "productivity", keywords: ["Claude skills trabajo", "Claude work skills", "AI assistant customization"], geo: "global", topic_en: "How to customize Claude for your specific industry with professional skills", topic_es: "Cómo personalizar Claude para tu industria específica con skills profesionales" },
  { category: "productivity", keywords: ["automatización marketing IA", "AI marketing automation", "content generation"], geo: "latam", topic_en: "AI-powered marketing automation: from content to campaigns in minutes", topic_es: "Automatización de marketing con IA: de contenido a campañas en minutos" },
  { category: "productivity", keywords: ["IA para abogados", "AI for lawyers", "legal tech"], geo: "latam", topic_en: "How lawyers are using AI agents to review contracts 10x faster", topic_es: "Cómo los abogados usan agentes de IA para revisar contratos 10 veces más rápido" },
  { category: "productivity", keywords: ["IA recursos humanos", "AI human resources", "HR automation"], geo: "global", topic_en: "AI in HR: automating recruitment, onboarding, and performance reviews", topic_es: "IA en RRHH: automatizando reclutamiento, onboarding y evaluaciones de desempeño" },
  { category: "productivity", keywords: ["IA finanzas", "AI finance", "financial analysis automation"], geo: "global", topic_en: "Financial analysis with AI agents: from spreadsheets to strategic insights", topic_es: "Análisis financiero con agentes de IA: de hojas de cálculo a insights estratégicos" },
  { category: "productivity", keywords: ["IA para equipos", "AI for teams", "team productivity"], geo: "global", topic_en: "Setting up AI agents for your entire team: a step-by-step guide", topic_es: "Configurando agentes de IA para todo tu equipo: guía paso a paso" },
  { category: "productivity", keywords: ["IA educación", "AI education", "teaching with AI"], geo: "latam", topic_en: "How educators are leveraging AI agents to create personalized learning experiences", topic_es: "Cómo los educadores aprovechan agentes de IA para crear experiencias de aprendizaje personalizadas" },

  // MCP ecosystem
  { category: "mcp", keywords: ["MCP protocol", "protocolo MCP", "Model Context Protocol"], geo: "global", topic_en: "Understanding the Model Context Protocol (MCP): the standard for AI tool integration", topic_es: "Entendiendo el Model Context Protocol (MCP): el estándar para integración de herramientas IA" },
  { category: "mcp", keywords: ["MCP vs API", "MCP comparación API", "AI integrations"], geo: "global", topic_en: "MCP vs traditional APIs: why the AI industry is shifting to a new standard", topic_es: "MCP vs APIs tradicionales: por qué la industria de IA está migrando a un nuevo estándar" },
  { category: "mcp", keywords: ["crear servidor MCP", "build MCP server", "MCP development"], geo: "global", topic_en: "How to build your first MCP server: a developer's guide", topic_es: "Cómo construir tu primer servidor MCP: guía para desarrolladores" },
  { category: "mcp", keywords: ["MCP connectors", "conectores MCP", "GitHub Slack MCP"], geo: "global", topic_en: "Top 20 MCP connectors every developer should know about", topic_es: "Los 20 conectores MCP más importantes que todo desarrollador debería conocer" },
  { category: "mcp", keywords: ["MCP enterprise", "MCP empresas", "enterprise AI integration"], geo: "global", topic_en: "MCP in the enterprise: how large organizations are adopting tool-use AI", topic_es: "MCP en la empresa: cómo las grandes organizaciones están adoptando IA con uso de herramientas" },

  // Industry
  { category: "industry", keywords: ["IA salud", "AI healthcare", "medical AI agents"], geo: "latam", topic_en: "AI agents in healthcare: improving diagnosis support and patient management", topic_es: "Agentes de IA en salud: mejorando el soporte diagnóstico y la gestión de pacientes" },
  { category: "industry", keywords: ["IA ecommerce", "AI ecommerce", "online store automation"], geo: "global", topic_en: "How e-commerce businesses are using AI agents to boost sales and customer service", topic_es: "Cómo los negocios de e-commerce usan agentes de IA para impulsar ventas y servicio al cliente" },
  { category: "industry", keywords: ["IA startups", "AI startups", "startup productivity"], geo: "global", topic_en: "Why startups that adopt AI agents early are outperforming competitors", topic_es: "Por qué las startups que adoptan agentes de IA temprano superan a sus competidores" },
  { category: "industry", keywords: ["IA contabilidad", "AI accounting", "automated bookkeeping"], geo: "latam", topic_en: "AI-powered accounting: automating invoicing, reconciliation, and tax prep", topic_es: "Contabilidad con IA: automatizando facturación, conciliación y preparación fiscal" },
  { category: "industry", keywords: ["IA diseño", "AI design", "creative AI tools"], geo: "global", topic_en: "AI tools for designers: from wireframes to brand guidelines in minutes", topic_es: "Herramientas IA para diseñadores: de wireframes a guías de marca en minutos" },
  { category: "industry", keywords: ["IA ventas", "AI sales", "sales automation"], geo: "global", topic_en: "Sales teams + AI agents: automating prospecting, follow-ups, and pipeline management", topic_es: "Equipos de ventas + agentes de IA: automatizando prospección, seguimiento y gestión de pipeline" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get recent posts to avoid repetition
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("slug, title")
      .order("created_at", { ascending: false })
      .limit(30);

    const recentTitles = (recentPosts || []).map((p: any) => p.title.toLowerCase());
    const recentSlugs = new Set((recentPosts || []).map((p: any) => p.slug));

    // Pick a random topic that hasn't been used recently
    const available = TOPIC_POOL.filter(t => {
      const slug = t.topic_en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      return !recentSlugs.has(slug) && !recentTitles.some(rt => rt.includes(t.topic_en.toLowerCase().slice(0, 30)));
    });

    if (available.length === 0) {
      return new Response(JSON.stringify({ message: "All topics covered recently, skipping." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topic = available[Math.floor(Math.random() * available.length)];

    // Get related skills for internal linking
    const { data: relatedSkills } = await supabase
      .from("skills")
      .select("slug, display_name, display_name_es, tagline, category")
      .eq("status", "approved")
      .eq("category", topic.category === "industry" ? "general" : topic.category)
      .order("avg_rating", { ascending: false })
      .limit(5);

    const { data: relatedConnectors } = await supabase
      .from("mcp_servers")
      .select("slug, name, description")
      .eq("status", "approved")
      .limit(3);

    const skillLinks = (relatedSkills || []).map((s: any) =>
      `- [${s.display_name}](/skill/${s.slug}): ${s.tagline}`
    ).join("\n");

    const connectorLinks = (relatedConnectors || []).map((c: any) =>
      `- [${c.name}](/conector/${c.slug}): ${c.description?.slice(0, 100)}`
    ).join("\n");

    const systemPrompt = `You are an expert technical writer specializing in AI agent security, productivity, and the MCP (Model Context Protocol) ecosystem. Write authoritative, SEO-optimized blog articles for Pymaia Skills (pymaiaskills.lovable.app), the #1 AI solutions directory.

CRITICAL RULES:
1. Write ~1500 words of genuinely useful, expert-level content
2. Use markdown formatting with H2 (##) and H3 (###) headers
3. Include practical examples, actionable advice, and data points
4. MUST include a FAQ section at the end with 3-5 questions/answers
5. MUST naturally incorporate internal links to the platform using markdown links
6. Write with authority — cite industry trends, reference real frameworks
7. Optimize for featured snippets: use definition paragraphs, numbered lists, comparison tables
8. Tone: professional but accessible, like a senior consultant explaining to a smart colleague`;

    const userPrompt = `Write a blog article about: "${topic.topic_en}"

SEO Keywords to naturally include: ${topic.keywords.join(", ")}
Category: ${topic.category}
Geo target: ${topic.geo}

Related tools from our catalog to link to:
${skillLinks || "No specific skills available"}

Related connectors:
${connectorLinks || "No specific connectors available"}

Also link to these platform pages where relevant:
- [Explore all AI solutions](/explorar)
- [MCP Server](/mcp)
- [Connectors](/conectores)
- [Security advisories](/seguridad)

Return your response using the generate_blog_post tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_blog_post",
            description: "Generate a complete blog post with all metadata",
            parameters: {
              type: "object",
              properties: {
                title_en: { type: "string", description: "SEO-optimized English title, max 60 chars" },
                title_es: { type: "string", description: "Spanish translation of the title" },
                excerpt_en: { type: "string", description: "English excerpt/summary, 1-2 sentences, max 200 chars" },
                excerpt_es: { type: "string", description: "Spanish excerpt" },
                content_en: { type: "string", description: "Full article in English, markdown format, ~1500 words" },
                content_es: { type: "string", description: "Full article in Spanish, markdown format" },
                meta_description_en: { type: "string", description: "English meta description, max 155 chars" },
                meta_description_es: { type: "string", description: "Spanish meta description, max 155 chars" },
              },
              required: ["title_en", "title_es", "excerpt_en", "excerpt_es", "content_en", "content_es", "meta_description_en", "meta_description_es"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_blog_post" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const article = JSON.parse(toolCall.function.arguments);

    // Generate slug
    const slug = article.title_en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Estimate reading time
    const wordCount = (article.content_en || "").split(/\s+/).length;
    const readingTime = Math.max(3, Math.ceil(wordCount / 250));

    // Generate cover image
    let coverImageUrl: string | null = null;
    try {
      const imagePrompt = `Blog cover image: ${article.title_en}. Professional, modern, tech-themed illustration. No text overlays.`;
      const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (imgResponse.ok) {
        const imgResult = await imgResponse.json();
        const base64 = imgResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (base64) {
          // Upload to storage
          const imageBytes = Uint8Array.from(atob(base64.split(",")[1] || base64), c => c.charCodeAt(0));
          const imagePath = `blog-covers/${slug}.jpg`;
          await supabase.storage.from("skill-uploads").upload(imagePath, imageBytes, {
            contentType: "image/jpeg",
            upsert: true,
          });
          const { data: publicUrl } = supabase.storage.from("skill-uploads").getPublicUrl(imagePath);
          coverImageUrl = publicUrl?.publicUrl || null;
        }
      }
    } catch (imgErr) {
      console.error("Cover image generation failed (non-blocking):", imgErr);
    }

    const { error: insertError } = await supabase.from("blog_posts").insert({
      slug,
      title: article.title_en,
      title_es: article.title_es,
      excerpt: article.excerpt_en,
      excerpt_es: article.excerpt_es,
      content: article.content_en,
      content_es: article.content_es,
      meta_description: article.meta_description_en,
      meta_description_es: article.meta_description_es,
      keywords: topic.keywords,
      category: topic.category,
      geo_target: topic.geo,
      related_skill_slugs: (relatedSkills || []).map((s: any) => s.slug),
      related_connector_slugs: (relatedConnectors || []).map((c: any) => c.slug),
      reading_time_minutes: readingTime,
      cover_image_url: coverImageUrl,
      status: "published",
    });

    if (insertError) {
      // If slug collision, append random suffix
      if (insertError.code === "23505") {
        const newSlug = `${slug}-${Date.now().toString(36)}`;
        await supabase.from("blog_posts").insert({
          slug: newSlug,
          title: article.title_en,
          title_es: article.title_es,
          excerpt: article.excerpt_en,
          excerpt_es: article.excerpt_es,
          content: article.content_en,
          content_es: article.content_es,
          meta_description: article.meta_description_en,
          meta_description_es: article.meta_description_es,
          keywords: topic.keywords,
          category: topic.category,
          geo_target: topic.geo,
          related_skill_slugs: (relatedSkills || []).map((s: any) => s.slug),
          related_connector_slugs: (relatedConnectors || []).map((c: any) => c.slug),
          reading_time_minutes: readingTime,
          status: "published",
        });
      } else {
        throw insertError;
      }
    }

    // Log
    await supabase.from("automation_logs").insert({
      function_name: "generate-blog-post",
      action_type: "blog_generated",
      reason: `Generated: ${article.title_en}`,
      metadata: { slug, category: topic.category, geo: topic.geo, word_count: wordCount },
    });

    return new Response(JSON.stringify({ success: true, slug, title: article.title_en }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
