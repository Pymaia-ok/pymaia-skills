import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { errorResponse } from "../_shared/error-helpers.ts";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";
import { validateAdminRequest, unauthorizedResponse } from "../_shared/admin-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin auth guard
  const auth = validateAdminRequest(req);
  if (!auth.authorized) return unauthorizedResponse(req, auth.reason);

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return errorResponse("RESEND_API_KEY not configured", 500, corsHeaders);

    const { to, subject, html, from, reply_to } = await req.json();

    if (!to || !subject || !html) {
      return errorResponse("Missing required fields: to, subject, html", 400, corsHeaders);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Pymaia Skills <notify@pymaia.com>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: reply_to || "hello@pymaia.com",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return errorResponse(`Resend API error: ${JSON.stringify(data)}`, 502, corsHeaders);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email error:", error);
    return errorResponse(error.message, 500, corsHeaders);
  }
});
