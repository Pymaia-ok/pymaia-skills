// Shared error response + failure logging helpers
import { corsHeaders } from "./cors.ts";

/** Return a JSON error Response with CORS headers */
export function errorResponse(
  message: string,
  status = 500,
  cors: Record<string, string> = corsHeaders
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Log a failure to automation_logs (fire-and-forget) */
export async function logFailure(
  supabase: any,
  functionName: string,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("automation_logs").insert({
      function_name: functionName,
      action_type: "error",
      reason: reason.slice(0, 500),
      metadata: metadata ?? {},
    });
  } catch {
    console.error(`[logFailure] Could not log to automation_logs: ${reason}`);
  }
}
