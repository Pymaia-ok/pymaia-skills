// version-monitor v2.0 — Rug pull detection + publisher account status check
// PRD 10.1: Check publisher GitHub accounts are still active
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { batch_size = 30 } = await req.json().catch(() => ({}));

    let checked = 0;
    let changed = 0;
    let publisherFlags = 0;
    const alerts: Array<{ item_type: string; slug: string; reason: string }> = [];

    const tables = [
      { name: "skills", type: "skill", contentFields: ["display_name", "description_human", "install_command", "readme_raw"] },
      { name: "mcp_servers", type: "connector", contentFields: ["name", "description", "install_command"] },
      { name: "plugins", type: "plugin", contentFields: ["name", "description", "github_url"] },
    ];

    const ghToken = Deno.env.get("GITHUB_TOKEN");
    const checkedAccounts = new Set<string>();

    for (const table of tables) {
      // ── Rug pull detection ──
      const { data: items } = await supabase
        .from(table.name)
        .select("*")
        .eq("status", "approved")
        .not("approved_content_hash", "is", null)
        .limit(batch_size);

      if (items) {
        for (const item of items) {
          const content = table.contentFields.map(f => (item as any)[f] || "").join("\n");
          const currentHash = await hashContent(content);
          const approvedHash = (item as any).approved_content_hash;

          if (approvedHash && currentHash !== approvedHash) {
            changed++;
            const reason = `Content hash changed for ${table.type} "${(item as any).slug}" — possible rug pull`;
            alerts.push({ item_type: table.type, slug: (item as any).slug, reason });

            await supabase.from("version_hashes").insert({
              item_id: item.id, item_type: table.type, item_slug: (item as any).slug,
              content_hash: currentHash,
              snapshot: { previous_hash: approvedHash, fields_checked: table.contentFields },
            });

            await supabase.from("security_incidents").insert({
              item_id: item.id, item_type: table.type, item_slug: (item as any).slug,
              severity: "P1", trigger_type: "version_monitor",
              description: reason,
              scan_result: { previous_hash: approvedHash, current_hash: currentHash },
            });

            await supabase.from(table.name).update({
              security_status: "flagged",
              security_notes: `Content changed after approval — re-review required (${new Date().toISOString()})`,
            }).eq("id", item.id);

            await supabase.from("automation_logs").insert({
              function_name: "version-monitor", action_type: "rug_pull_detected",
              reason, skill_id: table.type === "skill" ? item.id : null,
            });
          }
          checked++;

          // ── Publisher account status check (PRD 10.1) ──
          if (ghToken && (item as any).github_url) {
            const ghMatch = ((item as any).github_url as string).match(/github\.com\/([^\/]+)/);
            if (ghMatch && !checkedAccounts.has(ghMatch[1])) {
              const account = ghMatch[1];
              checkedAccounts.add(account);
              try {
                const res = await fetch(`https://api.github.com/users/${account}`, {
                  headers: { Authorization: `token ${ghToken}`, "User-Agent": "pymaia-security" },
                  signal: AbortSignal.timeout(5000),
                });
                if (res.status === 404) {
                  // Account deleted or suspended
                  publisherFlags++;
                  const existingInc = await supabase.from("security_incidents")
                    .select("id").eq("item_id", item.id).eq("trigger_type", "publisher_account_gone").eq("status", "open").maybeSingle();
                  if (!existingInc.data) {
                    await supabase.from("security_incidents").insert({
                      item_id: item.id, item_type: table.type, item_slug: (item as any).slug,
                      severity: "P2", trigger_type: "publisher_account_gone",
                      description: `GitHub account "${account}" is no longer accessible (deleted or suspended).`,
                    });
                    await supabase.from(table.name).update({
                      security_status: "flagged",
                      security_notes: `Publisher GitHub account "${account}" not found — flagged for review`,
                    }).eq("id", item.id);
                    await supabase.from("automation_logs").insert({
                      function_name: "version-monitor", action_type: "publisher_account_gone",
                      reason: `GitHub account "${account}" for ${table.type} "${(item as any).slug}" no longer exists`,
                      skill_id: table.type === "skill" ? item.id : null,
                    });
                  }
                }
              } catch { /* timeout — skip */ }
            }
          }
        }
      }

      // Set initial hashes for items without one
      const { data: noHash } = await supabase
        .from(table.name)
        .select("*")
        .eq("status", "approved")
        .is("approved_content_hash", null)
        .limit(batch_size);

      if (noHash) {
        for (const item of noHash) {
          const content = table.contentFields.map(f => (item as any)[f] || "").join("\n");
          const hash = await hashContent(content);
          await supabase.from(table.name).update({ approved_content_hash: hash }).eq("id", item.id);
          checked++;
        }
      }
    }

    return new Response(JSON.stringify({ checked, changed, publisher_flags: publisherFlags, alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("version-monitor error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
