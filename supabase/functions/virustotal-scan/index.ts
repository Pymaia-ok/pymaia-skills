// virustotal-scan v1.0 — VirusTotal API integration for file hash lookup & upload
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VT_API_BASE = "https://www.virustotal.com/api/v3";

async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface VTResult {
  verdict: "clean" | "suspicious" | "malicious" | "unknown";
  hash: string;
  detection_ratio: string;
  malicious_count: number;
  total_engines: number;
  code_insight_verdict: string | null;
  vt_permalink: string | null;
  scanned_at: string;
  error?: string;
}

async function lookupHash(hash: string, apiKey: string): Promise<Response> {
  return fetch(`${VT_API_BASE}/files/${hash}`, {
    headers: { "x-apikey": apiKey },
    signal: AbortSignal.timeout(15000),
  });
}

async function uploadContent(content: string, apiKey: string): Promise<Response> {
  const boundary = "----VTBoundary" + Date.now();
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="scan-content.txt"',
    "Content-Type: text/plain",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  return fetch(`${VT_API_BASE}/files`, {
    method: "POST",
    headers: {
      "x-apikey": apiKey,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(30000),
  });
}

function parseVTResult(data: any, hash: string): VTResult {
  const attrs = data?.data?.attributes;
  if (!attrs) {
    return {
      verdict: "unknown",
      hash,
      detection_ratio: "0/0",
      malicious_count: 0,
      total_engines: 0,
      code_insight_verdict: null,
      vt_permalink: null,
      scanned_at: new Date().toISOString(),
    };
  }

  const stats = attrs.last_analysis_stats || {};
  const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
  const total = Object.values(stats).reduce((a: number, b: any) => a + (Number(b) || 0), 0) as number;

  // Code Insight (crowdsourced AI results)
  const codeInsight = attrs.crowdsourced_ai_results?.[0]?.category || null;

  let verdict: VTResult["verdict"] = "clean";
  if (malicious >= 4) verdict = "malicious";
  else if (malicious >= 1) verdict = "suspicious";

  return {
    verdict,
    hash,
    detection_ratio: `${malicious}/${total}`,
    malicious_count: malicious,
    total_engines: total,
    code_insight_verdict: codeInsight,
    vt_permalink: `https://www.virustotal.com/gui/file/${hash}`,
    scanned_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("VIRUSTOTAL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "VIRUSTOTAL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content, item_id, item_type = "skill" } = await req.json().catch(() => ({} as any));

    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await sha256(content);

    // Step 1: Try hash lookup first (no quota cost if already scanned)
    let result: VTResult;
    try {
      const lookupRes = await lookupHash(hash, apiKey);

      if (lookupRes.ok) {
        const data = await lookupRes.json();
        result = parseVTResult(data, hash);
      } else if (lookupRes.status === 404) {
        // Not found — upload for scanning
        await lookupRes.text(); // consume body
        const uploadRes = await uploadContent(content, apiKey);
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          // After upload, VT queues analysis. We can't get results immediately.
          // Return "pending" with the hash for future lookups
          result = {
            verdict: "unknown",
            hash,
            detection_ratio: "pending",
            malicious_count: 0,
            total_engines: 0,
            code_insight_verdict: null,
            vt_permalink: `https://www.virustotal.com/gui/file/${hash}`,
            scanned_at: new Date().toISOString(),
          };
        } else {
          const errText = await uploadRes.text();
          result = {
            verdict: "unknown",
            hash,
            detection_ratio: "error",
            malicious_count: 0,
            total_engines: 0,
            code_insight_verdict: null,
            vt_permalink: null,
            scanned_at: new Date().toISOString(),
            error: `Upload failed: ${uploadRes.status} - ${errText.slice(0, 200)}`,
          };
        }
      } else {
        const errText = await lookupRes.text();
        // Rate limit or other error
        result = {
          verdict: "unknown",
          hash,
          detection_ratio: "error",
          malicious_count: 0,
          total_engines: 0,
          code_insight_verdict: null,
          vt_permalink: null,
          scanned_at: new Date().toISOString(),
          error: `Lookup failed: ${lookupRes.status} - ${errText.slice(0, 200)}`,
        };
      }
    } catch (e) {
      result = {
        verdict: "unknown",
        hash,
        detection_ratio: "error",
        malicious_count: 0,
        total_engines: 0,
        code_insight_verdict: null,
        vt_permalink: null,
        scanned_at: new Date().toISOString(),
        error: (e as Error).message,
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("virustotal-scan error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
