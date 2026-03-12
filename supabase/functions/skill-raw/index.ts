import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return new Response("Missing slug parameter", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("skills")
      .select("install_command, display_name, slug")
      .eq("slug", slug)
      .eq("status", "approved")
      .eq("is_public", true)
      .single();

    if (error || !data) {
      return new Response("Skill not found", { status: 404, headers: corsHeaders });
    }

    return new Response(data.install_command, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `inline; filename="${data.slug}.md"`,
      },
    });
  } catch (e) {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
