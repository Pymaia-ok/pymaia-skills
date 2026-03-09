// version-monitor v1.0 — Rug pull detection via content hash monitoring
// Compares current content hashes against approved baselines
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const alerts: Array<{ item_type: string; slug: string; reason: string }> = [];

    const tables = [
      { name: "skills", type: "skill", contentFields: ["display_name", "description_human", "install_command", "readme_raw"] },
      { name: "mcp_servers", type: "connector", contentFields: ["name", "description", "install_command"] },
      { name: "plugins", type: "plugin", contentFields: ["name", "description", "github_url"] },
    ];

    for (const table of tables) {
      // Get items that have an approved hash
      const { data: items } = await supabase
        .from(table.name)
        .select("*")
        .eq("status", "approved")
        .not("approved_content_hash", "is", null)
        .limit(batch_size);

      if (!items) continue;

      for (const item of items) {
        const content = table.contentFields
          .map(f => (item as any)[f] || "")
          .join("\n");
        const currentHash = await hashContent(content);
        const approvedHash = (item as any).approved_content_hash;

        if (approvedHash && currentHash !== approvedHash) {
          changed++;
          const reason = `Content hash changed for ${table.type} "${(item as any).slug}" — possible rug pull`;
          alerts.push({ item_type: table.type, slug: (item as any).slug, reason });

          // Store version hash for audit trail
          await supabase.from("version_hashes").insert({
            item_id: item.id,
            item_type: table.type,
            item_slug: (item as any).slug,
            content_hash: currentHash,
            snapshot: { previous_hash: approvedHash, fields_checked: table.contentFields },
          });

          // Create security incident
          await supabase.from("security_incidents").insert({
            item_id: item.id,
            item_type: table.type,
            item_slug: (item as any).slug,
            severity: "P1",
            trigger_type: "version_monitor",
            description: reason,
            scan_result: { previous_hash: approvedHash, current_hash: currentHash },
          });

          // Flag the item
          await supabase.from(table.name).update({
            security_status: "flagged",
            security_notes: `Content changed after approval — re-review required (${new Date().toISOString()})`,
          }).eq("id", item.id);

          // Log
          await supabase.from("automation_logs").insert({
            function_name: "version-monitor",
            action_type: "rug_pull_detected",
            reason,
            skill_id: table.type === "skill" ? item.id : null,
          });
        }
        checked++;
      }

      // Set initial hashes for items that don't have one yet
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

    return new Response(JSON.stringify({ checked, changed, alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("version-monitor error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
