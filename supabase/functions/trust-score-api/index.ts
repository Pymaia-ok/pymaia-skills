// trust-score-api v1.0 — Public API to query Trust Score for any item
// PRD Phase 4: API pública de Trust Score
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const type = url.searchParams.get("type") || "skill"; // skill | connector | plugin

    if (!slug) {
      return new Response(JSON.stringify({ error: "slug parameter required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tableName = type === "connector" ? "mcp_servers" : type === "plugin" ? "plugins" : "skills";
    const hasIsOfficial = type !== "skill"; // skills table doesn't have is_official column

    const selectFields = hasIsOfficial
      ? "slug, trust_score, security_status, security_scanned_at, created_at, is_official"
      : "slug, trust_score, security_status, security_scanned_at, created_at";

    const { data: item, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq("slug", slug)
      .eq("status", "approved")
      .single();

    if (error || !item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trustScore = (item as any).trust_score || 0;
    let badge = "new";
    if (trustScore >= 90) badge = "official";
    else if (trustScore >= 80) badge = "verified";
    else if (trustScore >= 60) badge = "trusted";
    else if (trustScore >= 40) badge = "reviewed";

    return new Response(JSON.stringify({
      slug: (item as any).slug,
      type,
      trust_score: trustScore,
      badge,
      security_status: (item as any).security_status,
      scanned_at: (item as any).security_scanned_at,
      is_official: (item as any).is_official || false,
      // Badge embed URL
      badge_url: `https://pymaiaskills.lovable.app/api/badge/${type}/${slug}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
