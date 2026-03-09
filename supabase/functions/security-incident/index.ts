// security-incident v2.0 — Incident response, abuse report escalation & publisher notification
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const { action = "check_escalation" } = body;

    if (action === "check_escalation") return await handleEscalation(supabase, supabaseUrl, serviceKey);
    if (action === "resolve_incident") return await handleResolve(supabase, body);
    if (action === "create_advisory") return await handleAdvisory(supabase, body);
    if (action === "check_uninstall_spikes") return await handleUninstallSpikes(supabase);

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

// ── Helper: send email via send-email function ──
async function sendEmail(supabaseUrl: string, serviceKey: string, to: string, subject: string, html: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (e) {
    console.error("Failed to send email:", e);
  }
}

// ── Helper: get publisher email from creator_id ──
async function getPublisherEmail(supabase: any, creatorId: string | null): Promise<string | null> {
  if (!creatorId) return null;
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(creatorId);
    return user?.email || null;
  } catch { return null; }
}

// ── Helper: get table name from item_type ──
function tableName(itemType: string): string {
  return itemType === "connector" ? "mcp_servers" : itemType === "plugin" ? "plugins" : "skills";
}

async function handleEscalation(supabase: any, supabaseUrl: string, serviceKey: string) {
  const { data: reports } = await supabase
    .from("security_reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (!reports || reports.length === 0) {
    return new Response(JSON.stringify({ escalated: 0, delisted: 0, notified_publishers: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const byItem = new Map<string, any[]>();
  for (const r of reports) {
    const key = `${r.item_type}:${r.item_id}`;
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key)!.push(r);
  }

  let escalated = 0;
  let delisted = 0;
  let notifiedPublishers = 0;

  for (const [key, itemReports] of byItem) {
    const [itemType, itemId] = key.split(":");
    const table = tableName(itemType);

    // Get the item to find creator_id
    const { data: itemData } = await supabase.from(table).select("creator_id, slug, name, display_name").eq("id", itemId).maybeSingle();
    const creatorId = itemData?.creator_id;
    const itemName = itemData?.display_name || itemData?.name || itemReports[0].item_slug;

    // ── Rule: Data exfiltration → immediate delist ──
    const hasExfiltration = itemReports.some((r: any) => r.report_type === "data_exfiltration");
    if (hasExfiltration) {
      await supabase.from(table).update({
        status: "rejected",
        security_status: "flagged",
        security_notes: `Delisted: data exfiltration report — ${new Date().toISOString()}`,
      }).eq("id", itemId);

      let affectedCount = 0;
      if (itemType === "skill") {
        const { count } = await supabase.from("installations").select("id", { count: "exact", head: true }).eq("skill_id", itemId);
        affectedCount = count ?? 0;
      }

      await supabase.from("security_incidents").insert({
        item_id: itemId, item_type: itemType, item_slug: itemReports[0].item_slug,
        severity: "P0", trigger_type: "abuse_report",
        description: `Data exfiltration reported — auto-delisted. ${itemReports.length} report(s).`,
        affected_users_count: affectedCount,
      });

      // Notify affected users
      if (affectedCount > 0 && itemType === "skill") {
        const { data: installs } = await supabase.from("installations").select("user_id").eq("skill_id", itemId).limit(200);
        if (installs) {
          const uniqueUserIds = [...new Set(installs.map((i: any) => i.user_id))];
          for (const userId of uniqueUserIds.slice(0, 100)) {
            const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
            if (!authUser?.email) continue;
            await sendEmail(supabaseUrl, serviceKey, authUser.email,
              `[SEGURIDAD] El skill "${itemReports[0].item_slug}" fue removido`,
              `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px;">
                  <h2 style="margin:0 0 8px;color:#dc2626;">⚠️ Alerta de seguridad</h2>
                  <p style="margin:0;color:#991b1b;">El skill <strong>"${itemReports[0].item_slug}"</strong> fue removido por razones de seguridad.</p>
                </div>
                <p><strong>Razón:</strong> Reporte de exfiltración de datos recibido y confirmado.</p>
                <p><strong>Acción recomendada:</strong> Si tienes este skill instalado, remuévelo de tu configuración de Claude inmediatamente.</p>
                <p style="margin-top:16px;font-size:12px;color:#9ca3af;">— Equipo de Seguridad, Pymaia</p>
              </div>`
            );
          }
          await supabase.from("security_incidents").update({ notified_users: true }).eq("item_id", itemId).eq("status", "open");
        }
      }

      // Notify publisher about delist
      const pubEmail = await getPublisherEmail(supabase, creatorId);
      if (pubEmail) {
        await sendEmail(supabaseUrl, serviceKey, pubEmail,
          `Tu ${itemType} "${itemName}" fue removido de Pymaia`,
          `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#dc2626;">⚠️ Tu ${itemType} fue removido</h2>
            <p>Tu ${itemType} <strong>"${itemName}"</strong> fue removido del catálogo de Pymaia debido a un reporte de exfiltración de datos.</p>
            <p>Si consideras que fue un error, podés responder a este email para apelar la decisión.</p>
            <p style="font-size:12px;color:#9ca3af;">— Equipo de Seguridad, Pymaia</p>
          </div>`
        );
        notifiedPublishers++;
      }

      delisted++;
      continue;
    }

    // ── Rule: 3+ reports → auto-escalate ──
    if (itemReports.length >= 3) {
      const existingIncident = await supabase
        .from("security_incidents").select("id").eq("item_id", itemId).eq("status", "open").maybeSingle();

      if (!existingIncident.data) {
        await supabase.from("security_incidents").insert({
          item_id: itemId, item_type: itemType, item_slug: itemReports[0].item_slug,
          severity: "P1", trigger_type: "abuse_report_escalation",
          description: `${itemReports.length} abuse reports received — auto-escalated for review.`,
        });
        await supabase.from(table).update({
          security_status: "flagged",
          security_notes: `Multiple abuse reports (${itemReports.length}) — under review`,
        }).eq("id", itemId);
        escalated++;
      }
    }

    // ── Rule: 1 report → log + notify publisher (PRD 9.3) ──
    if (itemReports.length === 1) {
      await supabase.from("automation_logs").insert({
        function_name: "security-incident",
        action_type: "report_logged",
        reason: `Security report logged for ${itemType} "${itemReports[0].item_slug}" — type: ${itemReports[0].report_type}`,
        skill_id: itemType === "skill" ? itemId : null,
      });

      // Notify publisher about the report
      const pubEmail = await getPublisherEmail(supabase, creatorId);
      if (pubEmail) {
        await sendEmail(supabaseUrl, serviceKey, pubEmail,
          `Reporte de seguridad recibido para tu ${itemType} "${itemName}"`,
          `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:16px;">
              <h2 style="margin:0 0 8px;color:#92400e;">📋 Reporte de seguridad recibido</h2>
              <p style="margin:0;color:#78350f;">Se recibió un reporte sobre tu ${itemType} <strong>"${itemName}"</strong>.</p>
            </div>
            <p><strong>Tipo de reporte:</strong> ${itemReports[0].report_type}</p>
            <p><strong>Descripción:</strong> ${itemReports[0].description?.slice(0, 200) || "Sin detalles adicionales"}</p>
            <p style="margin-top:12px;">Nuestro equipo revisará el reporte. Si se confirma un problema, te contactaremos con los próximos pasos.</p>
            <p style="font-size:12px;color:#9ca3af;">— Equipo de Seguridad, Pymaia</p>
          </div>`
        );
        notifiedPublishers++;
      }
    }
  }

  return new Response(JSON.stringify({ escalated, delisted, notified_publishers: notifiedPublishers, total_reports: reports.length }), {
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

  await supabase.from("security_incidents").update({
    status: "resolved", resolution_notes, resolved_by,
    resolved_at: new Date().toISOString(),
  }).eq("id", incident_id);

  if (restore_item) {
    const table = tableName(incident.item_type);
    await supabase.from(table).update({
      status: "approved", security_status: "verified",
      security_notes: `Restored after incident review: ${resolution_notes}`,
    }).eq("id", incident.item_id);
  }

  await supabase.from("security_reports").update({
    status: "resolved", resolution_notes,
    resolved_at: new Date().toISOString(), resolved_by,
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
    incident_id, title, description, severity: incident.severity,
    item_type: incident.item_type, item_slug: incident.item_slug, item_name: incident.item_slug,
    action_taken, is_public,
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

// ── Uninstall spike detection (PRD 5.2 item 9) ──
async function handleUninstallSpikes(supabase: any) {
  // Check for skills with high recent uninstall rate vs install rate
  // Using installations table — if many installs were recently deleted, that's a spike
  // We check install_count vs actual installations count (diff = uninstalls)
  const { data: skills } = await supabase
    .from("skills")
    .select("id, slug, install_count")
    .eq("status", "approved")
    .gt("install_count", 10)
    .limit(100);

  if (!skills) return new Response(JSON.stringify({ checked: 0, spikes: 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  let spikes = 0;
  for (const skill of skills) {
    const { count: currentInstalls } = await supabase
      .from("installations")
      .select("id", { count: "exact", head: true })
      .eq("skill_id", skill.id);

    // If recorded install_count is significantly higher than actual installations, there's been uninstalls
    const uninstallRate = (skill.install_count - (currentInstalls ?? 0)) / Math.max(1, skill.install_count);
    if (uninstallRate > 0.3 && skill.install_count > 20) {
      // 30%+ uninstall rate is suspicious
      const existing = await supabase.from("security_incidents")
        .select("id").eq("item_id", skill.id).eq("trigger_type", "uninstall_spike").eq("status", "open").maybeSingle();
      
      if (!existing.data) {
        await supabase.from("security_incidents").insert({
          item_id: skill.id, item_type: "skill", item_slug: skill.slug,
          severity: "P2", trigger_type: "uninstall_spike",
          description: `High uninstall rate detected: ${Math.round(uninstallRate * 100)}% (${skill.install_count} installs, ${currentInstalls} remaining)`,
        });
        spikes++;
      }
    }
  }

  return new Response(JSON.stringify({ checked: skills.length, spikes }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
