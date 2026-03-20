// Restrictive CORS — only allow known origins
const ALLOWED_ORIGINS = [
  "https://pymaiaskills.lovable.app",
  "https://mcp.pymaia.com",
  "https://pymaia.com",
  "https://www.pymaia.com",
];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

/**
 * Returns CORS headers matching the request origin against the allow-list.
 * Falls back to the primary domain if origin is missing or not allowed.
 * In local dev (localhost), any port is accepted.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";

  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    // Lovable preview URLs
    origin.endsWith(".lovable.app");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

/** Static fallback for server-to-server calls (cron jobs, internal) */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};
