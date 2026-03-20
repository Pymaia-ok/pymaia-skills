/**
 * Admin authentication for sensitive edge functions.
 * Validates either:
 * 1. ADMIN_FUNCTION_SECRET in Authorization header (preferred)
 * 2. Supabase service-role key (internal cron calls)
 *
 * IMPORTANT: If ADMIN_FUNCTION_SECRET is not configured, access is DENIED.
 * This ensures all admin endpoints are protected by default.
 */

import { getCorsHeaders } from "./cors.ts";

export function validateAdminRequest(req: Request): { authorized: boolean; reason?: string } {
  const adminSecret = Deno.env.get("ADMIN_FUNCTION_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // If no admin secret configured, DENY access (secure by default)
  if (!adminSecret) {
    return { authorized: false, reason: "ADMIN_FUNCTION_SECRET not configured" };
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
