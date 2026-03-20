import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@^2.98.0";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const pluginSlug = url.searchParams.get("plugin");

    // If specific plugin requested, return its detail
    if (pluginSlug) {
      const { data: plugin, error } = await supabase
        .from("plugins")
        .select("*")
        .eq("slug", pluginSlug)
        .eq("status", "approved")
        .single();

      if (error || !plugin) {
        return new Response(
          JSON.stringify({ error: "Plugin not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const entry = {
        name: plugin.slug,
        version: "1.0.0",
        description: plugin.description,
        author: "pymaia-community",
        license: "MIT",
        homepage: `https://pymaiaskills.lovable.app/plugin/${plugin.slug}`,
        repository: plugin.github_url || undefined,
        platform: plugin.platform,
        category: plugin.category,
        verified: plugin.is_official || plugin.security_status === "verified",
        install: `claude plugin install ${plugin.slug}@pymaia`,
      };

      return new Response(
        JSON.stringify(entry),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return full registry index
    const { data: plugins, error } = await supabase
      .from("plugins")
      .select("slug, name, description, platform, category, is_official, is_anthropic_verified, security_status, github_url, install_count, avg_rating, review_count")
      .eq("status", "approved")
      .order("install_count", { ascending: false });

    if (error) throw error;

    const registry = {
      name: "pymaia-plugins",
      version: "1.0.0",
      description: "Pymaia Plugin Marketplace — curated plugins for Claude Code and Cowork",
      homepage: "https://pymaiaskills.lovable.app/plugins",
      updated_at: new Date().toISOString(),
      total_plugins: (plugins || []).length,
      plugins: (plugins || []).map((p: any) => ({
        name: p.slug,
        display_name: p.name,
        description: p.description,
        platform: p.platform,
        category: p.category,
        install: `claude plugin install ${p.slug}@pymaia`,
        verified: p.is_official || p.is_anthropic_verified || p.security_status === "verified",
        anthropic_verified: p.is_anthropic_verified,
        installs: p.install_count,
        rating: p.avg_rating > 0 ? Number(p.avg_rating) : undefined,
        reviews: p.review_count > 0 ? p.review_count : undefined,
        repository: p.github_url || undefined,
      })),
    };

    return new Response(
      JSON.stringify(registry, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("plugin-registry error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
