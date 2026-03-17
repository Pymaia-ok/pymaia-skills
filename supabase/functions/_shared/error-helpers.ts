// Shared error response + failure logging helpers

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Return a JSON error Response with CORS headers */
export function errorResponse(
  message: string,
  status = 500,
  cors = defaultCorsHeaders
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
