// poll-vt-pending v1.0 — Polls VirusTotal for items with "pending" scan results
// Runs every 10 minutes via pg_cron to retrieve final verdicts after upload
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse } from "../_shared/error-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VT_API_BASE = "https://www.virustotal.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const vtApiKey = Deno.env.get("VIRUSTOTAL_API_KEY");
    if (!vtApiKey) {
      return new Response(JSON.stringify({ error: "VIRUSTOTAL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { batch_size = 4 } = await req.json().catch(() => ({}));

    // VT free tier: 4 req/min, so we process max 4 per invocation
    const effectiveBatch = Math.min(batch_size, 4);

    const tables = [
      { name: "skills", type: "skill" },
      { name: "plugins", type: "plugin" },
      { name: "mcp_servers", type: "connector" },
    ];

    let polled = 0;
    let resolved = 0;
    let upgraded = 0;

    for (const table of tables) {
      if (polled >= effectiveBatch) break;

      // Find items where VT result is "pending"
      const { data: items } = await supabase
        .from(table.name)
        .select("id, slug, security_scan_result")
        .eq("status", "approved")
        .not("security_scan_result", "is", null)
        .limit(effectiveBatch - polled);

      if (!items || items.length === 0) continue;

      // Filter in-memory for pending VT results
      const pendingItems = items.filter((item: any) => {
        const vt = item.security_scan_result?.layers?.virustotal;
        return vt && (vt.verdict === "pending" || vt.detection_ratio === "pending");
      });

      for (const item of pendingItems) {
        if (polled >= effectiveBatch) break;

        const vtData = (item as any).security_scan_result?.layers?.virustotal;
        const vtHash = vtData?.hash;
        if (!vtHash) continue;

        try {
          polled++;
          const vtRes = await fetch(`${VT_API_BASE}/files/${vtHash}`, {
            headers: { "x-apikey": vtApiKey },
            signal: AbortSignal.timeout(10000),
          });

          if (vtRes.ok) {
            const data = await vtRes.json();
            const stats = data?.data?.attributes?.last_analysis_stats || {};
            const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
            const total = Object.values(stats).reduce((a: number, b: any) => a + (Number(b) || 0), 0) as number;
            const codeInsight = data?.data?.attributes?.crowdsourced_ai_results?.[0]?.category || null;

            const newVtVerdict = malicious >= 4 ? "malicious" : malicious >= 1 ? "suspicious" : "clean";

            // Update the VT layer in scan_result
            const scanResult = { ...(item as any).security_scan_result };
            scanResult.layers = { ...scanResult.layers };
            scanResult.layers.virustotal = {
              hash: vtHash,
              detection_ratio: `${malicious}/${total}`,
              malicious_count: malicious,
              total_engines: total,
              code_insight_verdict: codeInsight,
              vt_permalink: `https://www.virustotal.com/gui/file/${vtHash}`,
              verdict: newVtVerdict,
              scanned_at: new Date().toISOString(),
              resolved_from_pending: true,
            };

            // Re-evaluate overall verdict if VT found something
            if (newVtVerdict === "malicious" && scanResult.verdict === "SAFE") {
              scanResult.verdict = "MALICIOUS";
              upgraded++;
            } else if (newVtVerdict === "suspicious" && scanResult.verdict === "SAFE") {
              scanResult.verdict = "SUSPICIOUS";
              upgraded++;
            }

            await supabase.from(table.name).update({
              security_scan_result: scanResult,
              security_scanned_at: new Date().toISOString(),
            }).eq("id", item.id);

            resolved++;

            // Log if verdict escalated
            if (newVtVerdict !== "clean" && newVtVerdict !== "pending") {
              await supabase.from("security_incidents").insert({
                item_id: item.id,
                item_type: table.type,
                item_slug: (item as any).slug,
                severity: newVtVerdict === "malicious" ? "P1" : "P2",
                trigger_type: "vt_poll",
                description: `VirusTotal polling resolved: ${newVtVerdict}. Detection: ${malicious}/${total}.`,
                scan_result: scanResult.layers.virustotal,
              });
            }

            await supabase.from("automation_logs").insert({
              function_name: "poll-vt-pending",
              action_type: newVtVerdict === "clean" ? "vt_resolved_clean" : "vt_resolved_flagged",
              reason: `${table.type} "${(item as any).slug}": VT ${newVtVerdict} (${malicious}/${total})`,
              skill_id: table.type === "skill" ? item.id : null,
            });

            console.log(`✅ VT resolved ${table.type} "${(item as any).slug}": ${newVtVerdict} (${malicious}/${total})`);
          } else {
            const errText = await vtRes.text();
            if (vtRes.status === 404) {
              // Still not processed by VT — leave as pending
              console.log(`⏳ VT still pending for ${table.type} "${(item as any).slug}"`);
            } else {
              console.error(`VT poll error for ${(item as any).slug}: ${vtRes.status} ${errText.slice(0, 100)}`);
            }
          }

          // Rate limiting: wait 1s between VT API calls (4/min limit)
          if (polled < effectiveBatch) {
            await new Promise(r => setTimeout(r, 1500));
          }
        } catch (e) {
          console.error(`VT poll failed for ${(item as any).slug}:`, (e as Error).message);
          await supabase.from("automation_logs").insert({
            function_name: "poll-vt-pending",
            action_type: "error",
            reason: `VT poll failed for ${table.type} "${(item as any).slug}": ${(e as Error).message}`.slice(0, 500),
          }).catch(() => {});
        }
      }
    }

    return new Response(JSON.stringify({ polled, resolved, upgraded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("poll-vt-pending error:", (e as Error).message);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("automation_logs").insert({ function_name: "poll-vt-pending", action_type: "error", reason: (e as Error).message.slice(0, 500) });
    } catch { /* fire-and-forget */ }
    return errorResponse((e as Error).message);
  }
});
