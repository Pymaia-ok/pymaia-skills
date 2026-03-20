/**
 * Admin authentication for sensitive edge functions.
 * Validates either:
 * 1. ADMIN_FUNCTION_SECRET in Authorization header (preferred)
 * 2. Supabase service-role key (internal cron calls)
 *
 * If ADMIN_FUNCTION_SECRET is not configured, access is allowed
 * (backward-compatible for existing cron jobs).
 */

import { getCorsHeaders } from "./cors.ts";

export function validateAdminRequest(req: Request): { authorized: boolean; reason?: string } {
  const adminSecret = Deno.env.get("ADMIN_FUNCTION_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // If no admin secret configured, allow access (backward compat)
  if (!adminSecret) {
    return { authorized: true };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  // Allow if token matches admin secret
  if (token === adminSecret) {
    return { authorized: true };
  }

  // Allow if token matches service-role key (internal cron/function calls)
  if (serviceRoleKey && token === serviceRoleKey) {
    return { authorized: true };
  }

  // Also allow anon key (for existing cron jobs during transition)
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (anonKey && token === anonKey) {
    return { authorized: true };
  }

  return { authorized: false, reason: "Invalid or missing admin credentials" };
}

export function unauthorizedResponse(req: Request, reason?: string): Response {
  return new Response(
    JSON.stringify({ error: reason || "Unauthorized" }),
    {
      status: 401,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    }
  );
}
