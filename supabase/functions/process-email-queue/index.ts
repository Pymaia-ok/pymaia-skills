import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch pending emails that are due
    const { data: emails, error: fetchErr } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Pymaia Skills <notify@pymaia.com>",
            to: [email.to_email],
            subject: email.subject,
            html: email.html_body,
            reply_to: "hello@pymaia.com",
          }),
        });

        const data = await res.json();

        if (res.ok) {
          // Mark as sent
          await supabase
            .from("email_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", email.id);

          // Log it
          await supabase.from("email_logs").insert({
            to_email: email.to_email,
            subject: email.subject,
            sequence_name: email.metadata?.sequence_name || null,
            step_index: email.step_index,
            status: "sent",
            resend_id: data.id,
          });

          // Advance enrollment if part of a sequence
          if (email.sequence_id) {
            await supabase
              .from("sequence_enrollments")
              .update({ current_step: email.step_index + 1 })
              .eq("email", email.to_email)
              .eq("sequence_id", email.sequence_id)
              .eq("status", "active");
          }

          sent++;
        } else {
          await supabase
            .from("email_queue")
            .update({ status: "failed", error: JSON.stringify(data) })
            .eq("id", email.id);

          await supabase.from("email_logs").insert({
            to_email: email.to_email,
            subject: email.subject,
            status: "failed",
          });

          failed++;
        }
      } catch (err) {
        await supabase
          .from("email_queue")
          .update({ status: "failed", error: err.message })
          .eq("id", email.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: emails.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-email-queue error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
