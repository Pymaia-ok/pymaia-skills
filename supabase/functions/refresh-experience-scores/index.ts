import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAdminRequest, unauthorizedResponse } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const auth = validateAdminRequest(req);
  if (!auth.authorized) return unauthorizedResponse(req, auth.reason);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Refresh the materialized view
    const { error: refreshErr } = await supabase.rpc("refresh_experience_scores");
    if (refreshErr) throw refreshErr;

    // Get stats for logging
    const { data: stats } = await supabase
      .from("experience_tool_scores")
      .select("tool_slug", { count: "exact", head: true });

    const toolCount = (stats as any)?.length ?? 0;

    await supabase.from("automation_logs").insert({
      function_name: "refresh-experience-scores",
      action_type: "refresh",
      reason: `Refreshed experience_tool_scores (${toolCount} tools). Cleaned old rate_limit_log entries.`,
    });

    return new Response(JSON.stringify({ ok: true, tools_scored: toolCount }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-experience-scores error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
