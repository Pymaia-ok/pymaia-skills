import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";
import { validateAdminRequest, unauthorizedResponse } from "../_shared/admin-auth.ts";

function inferCategory(name: string, desc: string): string {
  const text = `${name} ${desc}`.toLowerCase();
  // Specific domains first
  if (text.match(/\b(health|medical|clinic|hospital|patient|diagnosis|pharma|therapist|psycholog|dentist|nurse|doctor|wellness|fitness|nutrition|mental.?health|telemedicine|ehr\b|fhir\b)/)) return "salud";
  if (text.match(/\b(education|learning|teaching|teacher|student|course|curriculum|tutor|school|university|academic|quiz|exam|grading|lms\b|e.?learning|classroom|training|onboard)/)) return "educación";
  if (text.match(/\b(hr\b|human.?resource|recruit|hiring|talent|candidate|interview|resume|cv\b|payroll|employee|workforce|people.?ops|performance.?review|compensation)/)) return "rrhh";
  if (text.match(/\b(legal|lawyer|law\b|contract|compliance|regulat|gdpr|hipaa|attorney)/)) return "legal";
  if (text.match(/\b(e.?commerce|shopify|woocommerce|magento|cart|checkout|product.?catalog|inventory|warehouse|shipping|fulfillment|order.?manage|marketplace|dropship|retail)/)) return "ecommerce";
  if (text.match(/\b(finance|financial|accounting|bookkeep|tax\b|taxes|invoice|billing|payment|stripe|paypal|banking|loan|invest|portfolio|stock|trading|crypto|blockchain|budget|forecast|expense|revenue|cashflow|ledger|quickbooks|xero)/)) return "finanzas";
  if (text.match(/\b(sales|selling|lead.?gen|prospect|pipeline|deal|crm|salesforce|hubspot.?crm|cold.?email|outreach|pitch|demo|closing|b2b|b2c|sdr\b|bdr\b)/)) return "ventas";
  if (text.match(/\b(product.?manage|roadmap|feature.?request|backlog|sprint|agile|scrum|kanban|user.?story|prioriti|mvp|release|launch|product.?analytics|a.?b.?test|feedback|survey|nps\b)/)) return "producto";
  if (text.match(/\b(support|helpdesk|help.?desk|ticket|zendesk|freshdesk|intercom|live.?chat|customer.?service|troubleshoot|faq|knowledge.?base|incident|escalat|sla\b|customer.?success)/)) return "soporte";
  if (text.match(/\b(operations|ops\b|devops|sre\b|monitor|observ|logging|alert|uptime|incident.?manage|infra.?manage|scaling|load.?balanc|gitops|supply.?chain|logistics|procurement)/)) return "operaciones";
  // Broader categories
  if (text.match(/\b(marketing|seo\b|sem\b|adwords|campaign|newsletter|email.?market|social.?media|brand|copywriting|advertising|ads\b|hubspot|mailchimp|google.?ads)/)) return "marketing";
  if (text.match(/\b(design|figma|sketch|adobe|ui.?kit|ux\b|wireframe|prototype|tailwind|css|style|layout|responsive)/)) return "diseño";
  if (text.match(/\b(database|sql\b|postgres|mysql|mongo|redis|bigquery|snowflake|data.?warehouse|etl\b|csv|excel|xlsx|tableau|power.?bi|grafana|analytics|metric|dashboard|pandas|dataframe|dbt\b)/)) return "datos";
  if (text.match(/\b(automat|workflow|zapier|n8n|scrape|crawl|puppeteer|playwright|selenium|cron|schedul|webhook|integration|sync\b|orchestrat|trigger|batch|queue)/)) return "automatización";
  if (text.match(/\b(video|audio|music|sound|animation|3d\b|render|image.?gen|dall.?e|stable.?diffus|midjourney|creative|art\b|photo|podcast|youtube|tiktok)/)) return "creatividad";
  if (text.match(/\b(slack|discord|teams|notion|obsidian|todoist|trello|jira|asana|linear|calendar|email|gmail|pdf\b|document|note|wiki|translat|meeting|zoom)/)) return "productividad";
  if (text.match(/\b(business|startup|entrepreneur|pitch|investor|strategy|consult)/)) return "negocios";
  if (text.match(/\b(github|gitlab|docker|kubernetes|aws\b|azure|gcp\b|terraform|ci.?cd|deploy|server|api\b|rest\b|graphql|typescript|javascript|python|rust|golang|node|npm|lint|test|debug|git\b|commit|code.?review|webpack|vite\b|build)/)) return "desarrollo";
  if (text.match(/\b(ai\b|llm|language.?model|gpt|claude|gemini|openai|anthropic|embedding|vector|rag\b|chat.?bot|prompt|agent|copilot|assistant)/)) return "ia";
  if (text.match(/\b(mcp|server|tool|plugin|extension)/)) return "desarrollo";
  return "desarrollo";
}

function inferRoles(name: string, desc: string, category: string): string[] {
  const text = `${name} ${desc}`.toLowerCase();
  const roles: string[] = [];
  if (category === "marketing") roles.push("marketer");
  if (category === "legal") roles.push("abogado");
  if (category === "diseño") roles.push("disenador");
  if (category === "negocios") roles.push("founder");
  if (category === "datos") roles.push("consultor");
  if (category === "desarrollo" || category === "ia") roles.push("developer");
  if (text.match(/\b(market|seo|content|copy|social|brand)/)) roles.push("marketer");
  if (text.match(/\b(legal|contract|compliance|law\b)/)) roles.push("abogado");
  if (text.match(/\b(consult|strateg|proposal|research|analys)/)) roles.push("consultor");
  if (text.match(/\b(startup|product|pitch|founder|mvp|business)/)) roles.push("founder");
  if (text.match(/\b(design|ui|ux|figma|css|frontend)/)) roles.push("disenador");
  const unique = [...new Set(roles)];
  return unique.length > 0 ? unique : ["otro"];
}

function inferIndustry(bizCats: string): string[] {
  const cats = bizCats ? bizCats.split("|").map(c => c.trim()).filter(Boolean) : [];
  return cats.length > 0 ? cats : ["tecnologia"];
}

function formatDisplayName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bMcp\b/g, "MCP")
    .replace(/\bApi\b/g, "API")
    .replace(/\bUi\b/g, "UI")
    .replace(/\bUx\b/g, "UX")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bSql\b/g, "SQL")
    .replace(/\bCss\b/g, "CSS")
    .replace(/\bHtml\b/g, "HTML");
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function levenshteinDist(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin auth guard
  const auth = validateAdminRequest(req);
  if (!auth.authorized) return unauthorizedResponse(req, auth.reason);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { csv_url, offset = 0, limit = 2000 } = await req.json();
    if (!csv_url) return new Response(JSON.stringify({ error: "No csv_url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch existing slugs and github_urls for dedup
    const existingSlugs: string[] = [];
    const existingGithubUrls = new Set<string>();
    let dbOffset = 0;
    while (true) {
      const { data, error: dbErr } = await supabase.from("skills").select("slug, github_url").range(dbOffset, dbOffset + 999);
      if (dbErr || !data || data.length === 0) break;
      for (const s of data) {
        existingSlugs.push(s.slug);
        if (s.github_url) {
          const m = s.github_url.match(/github\.com\/([^\/]+\/[^\/\s?#]+)/);
          if (m) existingGithubUrls.add(m[1].toLowerCase().replace(/\.git$/, ""));
        }
      }
      if (data.length < 1000) break;
      dbOffset += 1000;
    }
    const existingSlugSet = new Set(existingSlugs);
    console.log(`Loaded ${existingSlugs.length} existing slugs, ${existingGithubUrls.size} github URLs for dedup`);

    console.log(`Fetching CSV from ${csv_url}, offset=${offset}, limit=${limit}`);
    const csvRes = await fetch(csv_url);
    if (!csvRes.ok) throw new Error(`Failed to fetch CSV: ${csvRes.status}`);
    const csvText = await csvRes.text();

    const lines = csvText.split("\n").filter((l: string) => l.trim().length > 0);
    const startIdx = lines[0]?.startsWith("id,") ? 1 : 0;
    
    // Apply offset and limit
    const sliceStart = startIdx + offset;
    const sliceEnd = Math.min(sliceStart + limit, lines.length);
    const chunk = lines.slice(sliceStart, sliceEnd);
    
    console.log(`Processing lines ${sliceStart}-${sliceEnd} of ${lines.length} total`);

    const skills: any[] = [];
    const seenSlugs = new Set<string>();

    for (const line of chunk) {
      const fields = parseCSVLine(line);
      if (fields.length < 10) continue;

      const [_id, name, description, _author, sourceUrl, installCommand, bizCategories, _techCategories, _useCases, _tags, _platforms, installs, stars] = fields;

      if (!name || name.trim().length === 0) continue;
      const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
      if (slug.length < 2 || slug.length > 200) continue;
      if (seenSlugs.has(slug)) continue;

      // Skip if already exists in DB by slug
      if (existingSlugSet.has(slug)) continue;

      // Skip if github_url already exists
      const githubMatch = (sourceUrl || "").match(/(https:\/\/github\.com\/[^\s,]+)/);
      const githubUrl = githubMatch ? githubMatch[1] : null;
      if (githubUrl) {
        const ghKey = githubUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").toLowerCase();
        if (existingGithubUrls.has(ghKey)) continue;
      }

      // Levenshtein dedup: skip if too similar to existing slug
      if (slug.length >= 4) {
        let tooSimilar = false;
        for (const existing of existingSlugs) {
          if (Math.abs(slug.length - existing.length) > 2) continue;
          if (levenshteinDist(slug, existing) <= 2 && slug !== existing) {
            console.log(`[dedup] Skipping CSV "${slug}" — too similar to "${existing}"`);
            tooSimilar = true;
            break;
          }
        }
        if (tooSimilar) continue;
      }

      seenSlugs.add(slug);

      const category = inferCategory(name, description || "");
      const targetRoles = inferRoles(name, description || "", category);
      const industry = inferIndustry(bizCategories || "");
      const displayName = formatDisplayName(name);
      const tagline = (description || "").length > 200 ? (description || "").slice(0, 197) + "..." : (description || displayName);

      const githubMatch = (sourceUrl || "").match(/(https:\/\/github\.com\/[^\s,]+)/);
      const githubUrl = githubMatch ? githubMatch[1] : null;

      skills.push({
        slug,
        display_name: displayName,
        tagline: tagline || displayName,
        description_human: description || `${displayName} — herramienta del ecosistema open-source de Agent Skills.`,
        category,
        industry,
        target_roles: targetRoles,
        install_command: installCommand || `npx skills add ${slug}`,
        github_url: githubUrl,
        github_stars: parseInt(stars || "0") || 0,
        install_count: parseInt(installs || "0") || 0,
        status: "pending",
        use_cases: [],
        time_to_install_minutes: 2,
        avg_rating: 0,
        review_count: 0,
      });
    }

    // Batch upsert with ON CONFLICT DO NOTHING
    let inserted = 0;
    let errors = 0;
    const batchSize = 200;

    for (let i = 0; i < skills.length; i += batchSize) {
      const batch = skills.slice(i, i + batchSize);
      const { error, count } = await supabase
        .from("skills")
        .upsert(batch, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });

      if (error) {
        console.error(`Batch error at ${i}:`, error.message);
        errors++;
      } else {
        inserted += count || 0;
      }
    }

    const totalLines = lines.length - startIdx;
    const hasMore = sliceEnd < lines.length;

    return new Response(
      JSON.stringify({
        total_lines: totalLines,
        chunk_processed: chunk.length,
        parsed: skills.length,
        inserted,
        errors,
        next_offset: hasMore ? offset + limit : null,
        has_more: hasMore,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Import error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
