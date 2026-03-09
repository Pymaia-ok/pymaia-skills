// check-mcp-health v2.0 — URL health + network security check for MCP servers
// PRD 10.1: Check MCP URLs accessible every 12 hours, warn if down >48hrs
// PRD 5.1 item 6: Validate HTTPS, port safety, SSL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validateNetworkSecurity(url: string): { secure: boolean; issues: string[] } {
  const issues: string[] = [];
  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== "https:") {
      issues.push(`URL uses ${parsed.protocol} instead of HTTPS`);
    }

    // Check for suspicious ports
    const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === "https:" ? 443 : 80);
    const safePorts = [80, 443, 8080, 8443, 3000, 3001, 5000, 8000, 8888];
    if (parsed.port && !safePorts.includes(port)) {
      issues.push(`Unusual port ${port} — may indicate dev/debug endpoint`);
    }

    // Check for 0.0.0.0 or localhost bindings
    if (/^(0\.0\.0\.0|127\.0\.0\.|localhost|10\.\d|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i.test(parsed.hostname)) {
      issues.push(`URL points to internal/local address: ${parsed.hostname}`);
    }

    // Check for IP-based URLs (not domain names)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
      issues.push("URL uses IP address instead of domain name");
    }

    // Check for credentials in URL
    if (parsed.username || parsed.password) {
      issues.push("URL contains embedded credentials");
    }
  } catch {
    issues.push("Invalid URL format");
  }

  return { secure: issues.length === 0, issues };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { batch_size = 30 } = await req.json().catch(() => ({}));

    // Get approved MCP servers with URLs
    const { data: servers } = await supabase
      .from("mcp_servers")
      .select("id, slug, github_url, homepage, docs_url, security_notes")
      .eq("status", "approved")
      .order("updated_at", { ascending: true })
      .limit(batch_size);

    if (!servers || servers.length === 0) {
      return new Response(JSON.stringify({ checked: 0, down: 0, network_issues: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let checked = 0;
    let down = 0;
    let networkIssues = 0;

    for (const server of servers) {
      const urls = [
        (server as any).github_url,
        (server as any).homepage,
        (server as any).docs_url,
      ].filter(Boolean);

      if (urls.length === 0) continue;

      // Network security validation for all URLs
      const allNetworkIssues: string[] = [];
      for (const url of urls) {
        const netCheck = validateNetworkSecurity(url);
        if (!netCheck.secure) {
          allNetworkIssues.push(...netCheck.issues.map(i => `${url}: ${i}`));
        }
      }

      if (allNetworkIssues.length > 0) {
        networkIssues++;
        // Update security notes with network issues
        const notes = (server as any).security_notes || "";
        if (!notes.includes("NETWORK_ISSUES:")) {
          await supabase.from("mcp_servers").update({
            security_notes: `${notes ? notes + " | " : ""}NETWORK_ISSUES: ${allNetworkIssues.join("; ")}`,
          }).eq("id", (server as any).id);
        }
      }

      // Reachability check
      let allDown = true;
      let sslError = false;
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(10000),
            redirect: "follow",
          });
          if (res.ok || res.status === 301 || res.status === 302 || res.status === 308) {
            allDown = false;
            break;
          }
        } catch (e) {
          // Check for SSL errors specifically
          const msg = (e as Error).message || "";
          if (/ssl|tls|certificate|cert/i.test(msg)) {
            sslError = true;
          }
        }
      }

      checked++;

      // Flag SSL errors
      if (sslError) {
        const notes = (server as any).security_notes || "";
        if (!notes.includes("SSL_ERROR")) {
          await supabase.from("mcp_servers").update({
            security_notes: `${notes ? notes + " | " : ""}SSL_ERROR: Invalid or expired SSL certificate`,
          }).eq("id", (server as any).id);
        }
      }

      if (allDown) {
        const notes = (server as any).security_notes || "";
        const downMatch = notes.match(/URL_DOWN_SINCE:(\d+)/);
        const downSince = downMatch ? parseInt(downMatch[1]) : Date.now();
        const downHours = (Date.now() - downSince) / (1000 * 60 * 60);

        if (!downMatch) {
          await supabase.from("mcp_servers").update({
            security_notes: `${notes ? notes + " | " : ""}URL_DOWN_SINCE:${Date.now()}`,
          }).eq("id", (server as any).id);
        }

        if (downHours > 48) {
          const existing = await supabase
            .from("security_incidents")
            .select("id")
            .eq("item_id", (server as any).id)
            .eq("trigger_type", "url_down")
            .eq("status", "open")
            .maybeSingle();

          if (!existing.data) {
            await supabase.from("security_incidents").insert({
              item_id: (server as any).id,
              item_type: "connector",
              item_slug: (server as any).slug,
              severity: "P3",
              trigger_type: "url_down",
              description: `MCP server URLs have been unreachable for ${Math.round(downHours)} hours.`,
            });
          }
          down++;
        }
      } else {
        // Clear down marker if back up
        const notes = (server as any).security_notes || "";
        if (notes.includes("URL_DOWN_SINCE:")) {
          await supabase.from("mcp_servers").update({
            security_notes: notes.replace(/\s*\|?\s*URL_DOWN_SINCE:\d+/, "").trim(),
          }).eq("id", (server as any).id);

          await supabase.from("security_incidents").update({
            status: "resolved",
            resolution_notes: "URL is accessible again",
            resolved_at: new Date().toISOString(),
          }).eq("item_id", (server as any).id).eq("trigger_type", "url_down").eq("status", "open");
        }
      }
    }

    return new Response(JSON.stringify({ checked, down, network_issues: networkIssues }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-mcp-health error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
