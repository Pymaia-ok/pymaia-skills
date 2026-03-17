// rescan-security v2.0 — Full catalog rotation re-scanning
// Rotates through ALL approved items weekly, not just stale ones
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse } from "../_shared/error-helpers.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { batch_size = 10 } = await req.json().catch(() => ({}));
    let rescanned = 0;
    let newFlags = 0;

    const tables = [
      { name: "skills", type: "skill" },
      { name: "mcp_servers", type: "connector" },
      { name: "plugins", type: "plugin" },
    ];

    for (const table of tables) {
      // Full rotation: get oldest-scanned items regardless of when they were last scanned
      // This ensures the entire catalog rotates through re-scanning weekly
      const { data: items } = await supabase
        .from(table.name)
        .select("id, slug, security_scan_result")
        .eq("status", "approved")
        .order("security_scanned_at", { ascending: true, nullsFirst: true })
        .limit(batch_size);

      if (!items || items.length === 0) continue;

      for (const item of items) {
        try {
          const prevVerdict = (item as any).security_scan_result?.verdict;

          const res = await fetch(`${supabaseUrl}/functions/v1/scan-security`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              item_id: item.id,
              item_type: table.type,
            }),
          });

          if (res.ok) {
            const result = await res.json();
            rescanned++;

            // Check if status changed to worse
            if (prevVerdict === "SAFE" && (result.verdict === "MALICIOUS" || result.verdict === "SUSPICIOUS")) {
              newFlags++;

              await supabase.from("security_incidents").insert({
                item_id: item.id,
                item_type: table.type,
                item_slug: (item as any).slug,
                severity: result.verdict === "MALICIOUS" ? "P1" : "P2",
                trigger_type: "rescan",
                description: `Re-scan detected new issues: ${result.verdict}. Previous: ${prevVerdict || "unknown"}.`,
                scan_result: result,
              });

              await supabase.from("automation_logs").insert({
                function_name: "rescan-security",
                action_type: "new_flag_on_rescan",
                reason: `${table.type} "${(item as any).slug}" newly flagged as ${result.verdict} on re-scan`,
                skill_id: table.type === "skill" ? item.id : null,
              });
            }
          }
        } catch (e) {
          console.error(`Failed to rescan ${table.type} ${item.id}:`, e);
          await supabase.from("automation_logs").insert({
            function_name: "rescan-security",
            action_type: "error",
            reason: `Failed to rescan ${table.type} ${(item as any).slug}: ${(e as Error).message}`.slice(0, 500),
          }).catch(() => {});
        }
      }
    }

    // Also trigger trust score recalculation
    try {
      await fetch(`${supabaseUrl}/functions/v1/calculate-trust-score`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ batch_size: 50 }),
      });
    } catch { /* non-critical */ }

    return new Response(JSON.stringify({ rescanned, newFlags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rescan-security error:", (e as Error).message);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("automation_logs").insert({ function_name: "rescan-security", action_type: "error", reason: (e as Error).message.slice(0, 500) });
    } catch {}
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
