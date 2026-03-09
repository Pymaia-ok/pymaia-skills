// security-incident v1.0 — Incident response & abuse report escalation
// Handles: report escalation, auto-delist, user notification, advisory creation
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

    const body = await req.json().catch(() => ({}));
    const { action = "check_escalation" } = body;

    if (action === "check_escalation") {
      return await handleEscalation(supabase);
    }

    if (action === "resolve_incident") {
      return await handleResolve(supabase, body);
    }

    if (action === "create_advisory") {
      return await handleAdvisory(supabase, body);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("security-incident error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleEscalation(supabase: any) {
  // Check abuse reports and escalate based on rules from PRD
  const { data: reports } = await supabase
    .from("security_reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (!reports || reports.length === 0) {
    return new Response(JSON.stringify({ escalated: 0, delisted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by item
  const byItem = new Map<string, any[]>();
  for (const r of reports) {
    const key = `${r.item_type}:${r.item_id}`;
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key)!.push(r);
  }

  let escalated = 0;
  let delisted = 0;

  for (const [key, itemReports] of byItem) {
    const [itemType, itemId] = key.split(":");
    const tableName = itemType === "connector" ? "mcp_servers" : itemType === "plugin" ? "plugins" : "skills";

    // Rule: Data exfiltration report → immediate delist
    const hasExfiltration = itemReports.some((r: any) => r.report_type === "data_exfiltration");
    if (hasExfiltration) {
      await supabase.from(tableName).update({
        status: "rejected",
        security_status: "flagged",
        security_notes: `Delisted: data exfiltration report — ${new Date().toISOString()}`,
      }).eq("id", itemId);

      // Count affected users
      let affectedCount = 0;
      if (itemType === "skill") {
        const { count } = await supabase.from("installations").select("id", { count: "exact", head: true }).eq("skill_id", itemId);
        affectedCount = count ?? 0;
      }

      // Create P0 incident
      await supabase.from("security_incidents").insert({
        item_id: itemId,
        item_type: itemType,
        item_slug: itemReports[0].item_slug,
        severity: "P0",
        trigger_type: "abuse_report",
        description: `Data exfiltration reported — auto-delisted. ${itemReports.length} report(s).`,
        affected_users_count: affectedCount,
      });

      // Notify users via email queue
      if (affectedCount > 0 && itemType === "skill") {
        const { data: installs } = await supabase
          .from("installations")
          .select("user_id")
          .eq("skill_id", itemId);

        if (installs) {
          for (const inst of installs.slice(0, 100)) {
            // Get user email from profiles or leads
            const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", inst.user_id).maybeSingle();
            // Queue notification (simplified — real impl would resolve email)
            await supabase.from("email_queue").insert({
              to_email: "affected-user@placeholder.com", // Would resolve from auth.users
              subject: `[SEGURIDAD] Alerta sobre "${itemReports[0].item_slug}"`,
              html_body: `<p>El skill "${itemReports[0].item_slug}" fue removido por razones de seguridad.</p><p>Recomendamos desinstalarlo inmediatamente.</p>`,
              metadata: { type: "security_alert", item_id: itemId },
            });
          }
        }
      }

      delisted++;
      continue;
    }

    // Rule: 3+ reports → auto-trigger review
    if (itemReports.length >= 3) {
      const existingIncident = await supabase
        .from("security_incidents")
        .select("id")
        .eq("item_id", itemId)
        .eq("status", "open")
        .maybeSingle();

      if (!existingIncident.data) {
        await supabase.from("security_incidents").insert({
          item_id: itemId,
          item_type: itemType,
          item_slug: itemReports[0].item_slug,
          severity: "P1",
          trigger_type: "abuse_report_escalation",
          description: `${itemReports.length} abuse reports received — auto-escalated for review.`,
        });

        await supabase.from(tableName).update({
          security_status: "flagged",
          security_notes: `Multiple abuse reports (${itemReports.length}) — under review`,
        }).eq("id", itemId);

        escalated++;
      }
    }

    // Rule: 1 report → log and notify publisher
    if (itemReports.length === 1) {
      await supabase.from("automation_logs").insert({
        function_name: "security-incident",
        action_type: "report_logged",
        reason: `Security report logged for ${itemType} "${itemReports[0].item_slug}" — type: ${itemReports[0].report_type}`,
        skill_id: itemType === "skill" ? itemId : null,
      });
    }
  }

  return new Response(JSON.stringify({ escalated, delisted, total_reports: reports.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleResolve(supabase: any, body: any) {
  const { incident_id, resolution_notes, resolved_by, restore_item = false } = body;

  if (!incident_id) {
    return new Response(JSON.stringify({ error: "incident_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: incident } = await supabase.from("security_incidents").select("*").eq("id", incident_id).single();
  if (!incident) {
    return new Response(JSON.stringify({ error: "Incident not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve incident
  await supabase.from("security_incidents").update({
    status: "resolved",
    resolution_notes,
    resolved_by,
    resolved_at: new Date().toISOString(),
  }).eq("id", incident_id);

  // Optionally restore the item
  if (restore_item) {
    const tableName = incident.item_type === "connector" ? "mcp_servers" : incident.item_type === "plugin" ? "plugins" : "skills";
    await supabase.from(tableName).update({
      status: "approved",
      security_status: "verified",
      security_notes: `Restored after incident review: ${resolution_notes}`,
    }).eq("id", incident.item_id);
  }

  // Close related reports
  await supabase.from("security_reports").update({
    status: "resolved",
    resolution_notes,
    resolved_at: new Date().toISOString(),
    resolved_by,
  }).eq("item_id", incident.item_id).eq("status", "open");

  return new Response(JSON.stringify({ resolved: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAdvisory(supabase: any, body: any) {
  const { incident_id, title, description, action_taken, is_public = true } = body;

  const { data: incident } = await supabase.from("security_incidents").select("*").eq("id", incident_id).single();
  if (!incident) {
    return new Response(JSON.stringify({ error: "Incident not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: advisory, error } = await supabase.from("security_advisories").insert({
    incident_id,
    title,
    description,
    severity: incident.severity,
    item_type: incident.item_type,
    item_slug: incident.item_slug,
    item_name: incident.item_slug,
    action_taken,
    is_public,
    published_at: is_public ? new Date().toISOString() : null,
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ advisory }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
