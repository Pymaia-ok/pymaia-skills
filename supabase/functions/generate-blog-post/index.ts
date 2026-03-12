import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOPIC_POOL = [
  // ═══ PRODUCTIVITY (~20 topics) ═══
  { category: "productivity", keywords: ["GTM automation", "go to market IA", "automatizar lanzamiento producto"], geo: "global", topic_en: "How to automate your Go-To-Market strategy with AI agents", topic_es: "Cómo automatizar tu estrategia Go-To-Market con agentes de IA" },
  { category: "productivity", keywords: ["competitive research AI", "investigación competencia IA", "market analysis"], geo: "global", topic_en: "5 ways to do competitive research in minutes using AI", topic_es: "5 formas de hacer investigación de competencia en minutos usando IA" },
  { category: "productivity", keywords: ["social media content AI", "contenido redes sociales IA", "content calendar"], geo: "global", topic_en: "Create a week of social media content in 10 minutes with AI", topic_es: "Crea una semana de contenido para redes sociales en 10 minutos con IA" },
  { category: "productivity", keywords: ["email automation AI", "automatización email IA", "cold outreach"], geo: "global", topic_en: "AI-powered email workflows: from cold outreach to follow-ups on autopilot", topic_es: "Flujos de email con IA: desde prospección fría hasta seguimientos en piloto automático" },
  { category: "productivity", keywords: ["meeting summaries AI", "resúmenes reuniones IA", "action items"], geo: "global", topic_en: "Never take meeting notes again: AI tools that summarize and create action items", topic_es: "No tomes notas en reuniones nunca más: herramientas IA que resumen y crean tareas" },
  { category: "productivity", keywords: ["CRM automation AI", "automatización CRM IA", "sales pipeline"], geo: "global", topic_en: "How to automate your CRM with AI: update deals, enrich contacts, and never miss a follow-up", topic_es: "Cómo automatizar tu CRM con IA: actualizar deals, enriquecer contactos y no perder seguimientos" },
  { category: "productivity", keywords: ["financial reporting AI", "reportes financieros IA", "automated dashboards"], geo: "global", topic_en: "Generate financial reports in seconds: AI tools for non-accountants", topic_es: "Genera reportes financieros en segundos: herramientas IA para no-contadores" },
  { category: "productivity", keywords: ["HR onboarding AI", "onboarding RRHH IA", "employee experience"], geo: "global", topic_en: "AI-powered employee onboarding: create welcome packages and training in minutes", topic_es: "Onboarding de empleados con IA: crea paquetes de bienvenida y capacitación en minutos" },
  { category: "productivity", keywords: ["project management AI", "gestión proyectos IA", "task automation"], geo: "global", topic_en: "How AI agents are replacing project management busywork in 2026", topic_es: "Cómo los agentes de IA están reemplazando el trabajo tedioso de gestión de proyectos en 2026" },
  { category: "productivity", keywords: ["content creation AI workflow", "flujo creación contenido IA", "blog writing"], geo: "global", topic_en: "The complete AI content creation workflow: research, write, edit, and publish", topic_es: "El flujo completo de creación de contenido con IA: investigar, escribir, editar y publicar" },
  { category: "productivity", keywords: ["data analysis AI no code", "análisis datos IA sin código", "spreadsheet automation"], geo: "global", topic_en: "Analyze any dataset without code: AI tools that turn spreadsheets into insights", topic_es: "Analiza cualquier dataset sin código: herramientas IA que convierten hojas de cálculo en insights" },
  { category: "productivity", keywords: ["proposal writing AI", "redacción propuestas IA", "business proposals"], geo: "global", topic_en: "Write winning business proposals in half the time with AI assistants", topic_es: "Escribe propuestas de negocio ganadoras en la mitad del tiempo con asistentes IA" },
  { category: "productivity", keywords: ["customer support AI", "soporte al cliente IA", "help desk automation"], geo: "global", topic_en: "Set up AI-powered customer support without a developer", topic_es: "Configura soporte al cliente con IA sin necesitar un desarrollador" },
  { category: "productivity", keywords: ["SEO automation AI", "automatización SEO IA", "keyword research"], geo: "global", topic_en: "Automate your SEO workflow: keyword research, content optimization, and reporting with AI", topic_es: "Automatiza tu flujo de SEO: investigación de keywords, optimización de contenido y reportes con IA" },
  { category: "productivity", keywords: ["inventory management AI", "gestión inventario IA", "stock automation"], geo: "latam", topic_en: "AI inventory management for small businesses: predict demand and automate restocking", topic_es: "Gestión de inventario con IA para pymes: predice demanda y automatiza reabastecimiento" },
  { category: "productivity", keywords: ["document processing AI", "procesamiento documentos IA", "OCR automation"], geo: "global", topic_en: "Process invoices, contracts, and forms automatically with AI document tools", topic_es: "Procesa facturas, contratos y formularios automáticamente con herramientas IA de documentos" },
  { category: "productivity", keywords: ["AI daily routine", "rutina diaria IA", "morning workflow"], geo: "global", topic_en: "The perfect AI morning routine: automate your first 2 hours of work", topic_es: "La rutina matutina perfecta con IA: automatiza tus primeras 2 horas de trabajo" },
  { category: "productivity", keywords: ["presentation AI", "presentaciones IA", "slide decks"], geo: "global", topic_en: "From idea to pitch deck in 15 minutes: AI tools for creating presentations", topic_es: "De idea a pitch deck en 15 minutos: herramientas IA para crear presentaciones" },
  { category: "productivity", keywords: ["lead generation AI", "generación leads IA", "prospecting automation"], geo: "global", topic_en: "AI-powered lead generation: find, qualify, and reach prospects automatically", topic_es: "Generación de leads con IA: encuentra, califica y contacta prospectos automáticamente" },
  { category: "productivity", keywords: ["translation AI business", "traducción IA negocios", "multilingual content"], geo: "latam", topic_en: "Expand to new markets: AI translation and localization tools for businesses", topic_es: "Expande a nuevos mercados: herramientas IA de traducción y localización para negocios" },

  // ═══ AGENTS (~12 topics) ═══
  { category: "agents", keywords: ["Claude features 2026", "novedades Claude", "Claude assistant"], geo: "global", topic_en: "Claude in 2026: new features that make it the most versatile AI assistant", topic_es: "Claude en 2026: nuevas funciones que lo convierten en el asistente IA más versátil" },
  { category: "agents", keywords: ["Manus AI agent", "agente Manus IA", "autonomous agent"], geo: "global", topic_en: "What is Manus and why everyone is talking about autonomous AI agents", topic_es: "Qué es Manus y por qué todos hablan de agentes de IA autónomos" },
  { category: "agents", keywords: ["Cursor AI non developers", "Cursor IA no programadores", "AI coding assistant"], geo: "global", topic_en: "Cursor for non-developers: how to use an AI coding assistant without writing code", topic_es: "Cursor para no-programadores: cómo usar un asistente de código IA sin escribir código" },
  { category: "agents", keywords: ["Antigravity AI", "agente Antigravity", "browser automation"], geo: "global", topic_en: "Antigravity: the AI agent that browses the web and completes tasks for you", topic_es: "Antigravity: el agente de IA que navega la web y completa tareas por ti" },
  { category: "agents", keywords: ["Gemini 2025 features", "Gemini funciones", "Google AI assistant"], geo: "global", topic_en: "Gemini's latest features: what Google's AI can do for your daily work", topic_es: "Las últimas funciones de Gemini: qué puede hacer la IA de Google por tu trabajo diario" },
  { category: "agents", keywords: ["OpenAI agent mode", "modo agente OpenAI", "ChatGPT agents"], geo: "global", topic_en: "OpenAI's agent mode explained: what it means for business users", topic_es: "El modo agente de OpenAI explicado: qué significa para usuarios de negocios" },
  { category: "agents", keywords: ["ClawBot AI", "agente ClawBot", "open source agent"], geo: "global", topic_en: "ClawBot: the open-source AI agent taking on Claude and GPT", topic_es: "ClawBot: el agente de IA open-source que compite con Claude y GPT" },
  { category: "agents", keywords: ["multi-agent collaboration", "colaboración multi-agente", "agent orchestration"], geo: "global", topic_en: "Multi-agent workflows: how to make AI agents work together on complex tasks", topic_es: "Flujos multi-agente: cómo hacer que agentes de IA trabajen juntos en tareas complejas" },
  { category: "agents", keywords: ["compare AI agents 2026", "comparar agentes IA", "Claude vs Gemini vs GPT"], geo: "global", topic_en: "Claude vs Gemini vs GPT vs Manus: which AI assistant fits your workflow?", topic_es: "Claude vs Gemini vs GPT vs Manus: ¿qué asistente IA se adapta a tu flujo de trabajo?" },
  { category: "agents", keywords: ["AI agent beginners guide", "guía principiantes agentes IA", "what are AI agents"], geo: "global", topic_en: "AI agents for beginners: what they are, how they work, and how to start using them today", topic_es: "Agentes de IA para principiantes: qué son, cómo funcionan y cómo empezar a usarlos hoy" },
  { category: "agents", keywords: ["AI agent skills", "skills agentes IA", "extend AI capabilities"], geo: "global", topic_en: "What are AI skills and why they're the next big thing for AI assistants", topic_es: "Qué son las skills de IA y por qué son la próxima gran novedad de los asistentes IA" },
  { category: "agents", keywords: ["AI agent security tools", "herramientas seguridad agentes IA", "safe AI agents"], geo: "global", topic_en: "How to make sure the AI agent you're using is safe: a non-technical checklist", topic_es: "Cómo asegurarte de que el agente de IA que usas es seguro: checklist no técnico" },

  // ═══ INDUSTRY (~10 topics) ═══
  { category: "industry", keywords: ["IA abogados contratos", "AI lawyers contracts", "legal automation"], geo: "latam", topic_en: "How lawyers are using AI agents to review contracts 10x faster", topic_es: "Cómo los abogados usan agentes de IA para revisar contratos 10 veces más rápido" },
  { category: "industry", keywords: ["AI sales pipeline", "pipeline ventas IA", "sales automation"], geo: "global", topic_en: "AI-powered sales pipelines: from lead to close without the busywork", topic_es: "Pipelines de ventas con IA: del lead al cierre sin trabajo tedioso" },
  { category: "industry", keywords: ["AI marketing campaigns", "campañas marketing IA", "campaign automation"], geo: "global", topic_en: "Launch marketing campaigns 5x faster with AI: a step-by-step playbook", topic_es: "Lanza campañas de marketing 5 veces más rápido con IA: guía paso a paso" },
  { category: "industry", keywords: ["IA ecommerce ventas", "AI ecommerce sales", "online store automation"], geo: "global", topic_en: "E-commerce + AI: automate product descriptions, customer service, and inventory", topic_es: "E-commerce + IA: automatiza descripciones de producto, atención al cliente e inventario" },
  { category: "industry", keywords: ["AI education teachers", "IA educación profesores", "personalized learning"], geo: "latam", topic_en: "AI tools for teachers: create lesson plans, quizzes, and feedback in minutes", topic_es: "Herramientas IA para profesores: crea planes de clase, evaluaciones y retroalimentación en minutos" },
  { category: "industry", keywords: ["AI freelancers productivity", "IA freelancers productividad", "solopreneur"], geo: "global", topic_en: "The freelancer's AI toolkit: 7 tools that replace an entire team", topic_es: "El toolkit de IA del freelancer: 7 herramientas que reemplazan un equipo completo" },
  { category: "industry", keywords: ["AI consulting firms", "IA consultoras", "consulting automation"], geo: "global", topic_en: "How consulting firms are using AI to deliver insights 3x faster", topic_es: "Cómo las consultoras están usando IA para entregar insights 3 veces más rápido" },
  { category: "industry", keywords: ["AI real estate", "IA inmobiliaria", "property management AI"], geo: "latam", topic_en: "AI for real estate: automate listings, client follow-ups, and market analysis", topic_es: "IA para inmobiliarias: automatiza listings, seguimiento de clientes y análisis de mercado" },
  { category: "industry", keywords: ["IA contabilidad pymes", "AI accounting SMB", "bookkeeping automation"], geo: "latam", topic_en: "AI-powered accounting for small businesses: invoicing, reconciliation, and tax prep", topic_es: "Contabilidad con IA para pymes: facturación, conciliación y preparación fiscal" },
  { category: "industry", keywords: ["AI healthcare clinics", "IA clínicas salud", "patient management"], geo: "latam", topic_en: "AI tools for healthcare clinics: patient scheduling, records, and follow-ups", topic_es: "Herramientas IA para clínicas: agendamiento, expedientes y seguimiento de pacientes" },

  // ═══ SECURITY (~5 topics, non-technical framing) ═══
  { category: "security", keywords: ["AI tool safety checklist", "checklist seguridad herramientas IA", "trust score"], geo: "global", topic_en: "Is this AI tool safe? A simple checklist anyone can follow", topic_es: "¿Es segura esta herramienta de IA? Un checklist simple que cualquiera puede seguir" },
  { category: "security", keywords: ["AI data privacy business", "privacidad datos IA negocios", "data protection"], geo: "global", topic_en: "What happens to your data when you use AI tools: a plain-English guide", topic_es: "Qué pasa con tus datos cuando usas herramientas de IA: guía en lenguaje simple" },
  { category: "security", keywords: ["AI scam tools fake", "herramientas IA falsas estafas", "typosquatting"], geo: "global", topic_en: "How to spot fake AI tools and avoid scams in 2026", topic_es: "Cómo detectar herramientas de IA falsas y evitar estafas en 2026" },
  { category: "security", keywords: ["AI permissions business", "permisos IA negocios", "access control"], geo: "global", topic_en: "AI tool permissions explained: what access should you grant and what to avoid", topic_es: "Permisos de herramientas IA explicados: qué acceso dar y qué evitar" },
  { category: "security", keywords: ["AI compliance small business", "cumplimiento IA pymes", "regulations"], geo: "latam", topic_en: "AI compliance for small businesses: what you need to know in 2026", topic_es: "Cumplimiento de IA para pymes: lo que necesitas saber en 2026" },

  // ═══ MCP (~5 topics, user-friendly framing) ═══
  { category: "mcp", keywords: ["connect apps AI assistant", "conectar apps asistente IA", "integrations"], geo: "global", topic_en: "How to connect Slack, Gmail, and Notion to your AI assistant", topic_es: "Cómo conectar Slack, Gmail y Notion a tu asistente de IA" },
  { category: "mcp", keywords: ["AI connectors explained", "conectores IA explicados", "MCP for beginners"], geo: "global", topic_en: "AI connectors explained: give your assistant superpowers without coding", topic_es: "Conectores de IA explicados: dale superpoderes a tu asistente sin programar" },
  { category: "mcp", keywords: ["best AI integrations 2026", "mejores integraciones IA", "top connectors"], geo: "global", topic_en: "The 15 most useful AI integrations for business teams in 2026", topic_es: "Las 15 integraciones de IA más útiles para equipos de trabajo en 2026" },
  { category: "mcp", keywords: ["AI automation no code", "automatización IA sin código", "workflow automation"], geo: "global", topic_en: "Build powerful AI automations without code using connectors and skills", topic_es: "Construye automatizaciones de IA poderosas sin código usando conectores y skills" },
  { category: "mcp", keywords: ["AI tool ecosystem", "ecosistema herramientas IA", "plugins connectors skills"], geo: "global", topic_en: "Skills, connectors, and plugins: understanding the AI tool ecosystem", topic_es: "Skills, conectores y plugins: entendiendo el ecosistema de herramientas de IA" },
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

    // Get related skills using keyword-based search
    const topicKeywords = topic.keywords[0] || topic.topic_en;
    const { data: relatedSkills } = await supabase
      .from("skills")
      .select("slug, display_name, display_name_es, tagline, category")
      .eq("status", "approved")
      .or(`display_name.ilike.%${topicKeywords.split(" ")[0]}%,tagline.ilike.%${topicKeywords.split(" ")[0]}%,category.eq.${topic.category}`)
      .order("install_count", { ascending: false })
      .limit(5);

    // Get related connectors matching topic keywords
    const connectorKeyword = topic.keywords[0]?.split(" ")[0] || "";
    const { data: relatedConnectors } = await supabase
      .from("mcp_servers")
      .select("slug, name, description")
      .eq("status", "approved")
      .or(`name.ilike.%${connectorKeyword}%,description.ilike.%${connectorKeyword}%`)
      .order("trust_score", { ascending: false })
      .limit(4);

    // Get related plugins
    const { data: relatedPlugins } = await supabase
      .from("plugins")
      .select("slug, name, description")
      .eq("status", "approved")
      .or(`name.ilike.%${connectorKeyword}%,category.eq.${topic.category === "agents" ? "development" : topic.category}`)
      .order("install_count", { ascending: false })
      .limit(3);

    const skillLinks = (relatedSkills || []).map((s: any) =>
      `- [${s.display_name}](/skill/${s.slug}): ${s.tagline}`
    ).join("\n");

    const connectorLinks = (relatedConnectors || []).map((c: any) =>
      `- [${c.name}](/conector/${c.slug}): ${c.description?.slice(0, 100)}`
    ).join("\n");

    const pluginLinks = (relatedPlugins || []).map((p: any) =>
      `- [${p.name}](/plugin/${p.slug}): ${p.description?.slice(0, 100)}`
    ).join("\n");

    const systemPrompt = `You are a friendly productivity writer for Pymaia Skills (pymaiaskills.lovable.app), the #1 directory of AI tools, skills, connectors, and plugins. Your audience is non-technical business professionals who want to work smarter with AI.

WRITING STYLE:
- Conversational and practical — like a smart friend showing you shortcuts
- No jargon unless you explain it immediately in parentheses
- Use "you" directly — make the reader the hero
- Include specific step-by-step instructions wherever possible
- Add before/after comparisons (e.g., "Before: 3 hours. With AI: 10 minutes")

STRUCTURE (mandatory):
1. Hook: Start with a relatable problem or surprising stat
2. What/Why: Brief explanation accessible to anyone
3. How-to: Step-by-step guide with specific tools from the Pymaia catalog
4. Real use case: A concrete scenario showing the workflow
5. FAQ section: 3-5 questions with clear answers
6. Call to action: Point readers to explore tools on the platform

CRITICAL RULES:
1. Write ~1500 words of genuinely useful content
2. Use markdown with ## and ### headers
3. MUST include internal links to skills, connectors, and plugins from the catalog
4. Reference specific AI agents (Claude, Gemini, Manus, Cursor, etc.) when relevant
5. Optimize for SEO: use keywords naturally, write definition paragraphs for featured snippets
6. Include numbered lists, comparison tables, and actionable takeaways
7. Every article must answer: "How can I actually DO this today?"
8. Tone: warm, empowering, practical — never condescending`;

    const userPrompt = `Write a blog article about: "${topic.topic_en}"

SEO Keywords to naturally include: ${topic.keywords.join(", ")}
Category: ${topic.category}
Geo target: ${topic.geo}

Related AI skills from our catalog (link to these!):
${skillLinks || "No specific skills — link to /explorar instead"}

Related connectors (integrations):
${connectorLinks || "No specific connectors — link to /conectores instead"}

Related plugins:
${pluginLinks || "No specific plugins — link to /plugins instead"}

Also link to these platform pages where relevant:
- [Explore all AI tools](/explorar)
- [Browse connectors](/conectores)
- [Browse plugins](/plugins)
- [Create your own skill](/crear-skill)
- [Getting started guide](/primeros-pasos)

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
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (imgResponse.ok) {
        const imgResult = await imgResponse.json();
        const base64 = imgResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (base64) {
          // Upload to public blog-covers bucket
          const raw = base64.includes(",") ? base64.split(",")[1] : base64;
          const imageBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
          const imagePath = `${slug}.jpg`;
          await supabase.storage.from("blog-covers").upload(imagePath, imageBytes, {
            contentType: "image/jpeg",
            upsert: true,
          });
          const { data: publicUrl } = supabase.storage.from("blog-covers").getPublicUrl(imagePath);
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
          cover_image_url: coverImageUrl,
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
