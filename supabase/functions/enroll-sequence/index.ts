import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://pymaiaskills.lovable.app",
  "https://id-preview--057a62fa-7fa9-4620-a2ec-a3e99f5cc83e.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Email templates
const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  welcome_day0: (data) => ({
    subject: "🎉 Bienvenido a Pymaia Skills",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <img src="https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" alt="Pymaia Skills" width="40" height="40" style="height: 40px; width: 40px; display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a; margin-bottom: 16px;">¡Bienvenido a Pymaia Skills!</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.6;">
          ${data.name ? `Hola ${data.name},` : 'Hola,'}<br/><br/>
          Acabás de dar el primer paso para potenciar tu productividad con IA. 
          Pymaia Skills te conecta con las mejores herramientas de IA para tu rol.
        </p>
        <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px; color: #0a0a0a;">🚀 Primeros pasos:</h3>
          <ol style="color: #525252; line-height: 2; padding-left: 20px;">
            <li><a href="https://pymaiaskills.lovable.app/explorar" style="color: #2563eb;">Explorá las Skills disponibles</a></li>
            <li>Instalá tu primera Skill en 2 minutos</li>
            <li>Compartí tu experiencia con la comunidad</li>
          </ol>
        </div>
        <a href="https://pymaiaskills.lovable.app/explorar" style="display: inline-block; background: #0a0a0a; color: #fafafa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Explorar Skills →
        </a>
        <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px;">
          Pymaia Skills — Las mejores herramientas de IA para tu trabajo.
        </p>
      </div>
    `,
  }),

  welcome_day2: (_data) => ({
    subject: "💡 3 Skills que están transformando equipos",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <img src="https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" alt="Pymaia Skills" width="40" height="40" style="height: 40px; width: 40px; display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a;">¿Ya encontraste tu Skill ideal?</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.6;">
          Estas son las Skills más populares esta semana:
        </p>
        <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">📊 Data Analyst Pro</p>
          <p style="color: #737373; margin: 4px 0 0;">Análisis de datos con lenguaje natural</p>
        </div>
        <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">✍️ Content Writer</p>
          <p style="color: #737373; margin: 4px 0 0;">Generación de contenido optimizado para SEO</p>
        </div>
        <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">📋 Project Manager AI</p>
          <p style="color: #737373; margin: 4px 0 0;">Gestión de proyectos con IA integrada</p>
        </div>
        <a href="https://pymaiaskills.lovable.app/explorar" style="display: inline-block; background: #0a0a0a; color: #fafafa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">
          Ver todas las Skills →
        </a>
        <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px;">Pymaia Skills</p>
      </div>
    `,
  }),

  welcome_day5: (_data) => ({
    subject: "🛠️ ¿Sabías que podés crear tu propia Skill?",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <img src="https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" alt="Pymaia Skills" width="40" height="40" style="height: 40px; width: 40px; display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a;">Creá tu propia Skill de IA</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.6;">
          Con nuestro asistente guiado, podés crear una Skill personalizada en minutos. 
          No necesitás saber programar — solo describí qué querés automatizar.
        </p>
        <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; padding: 24px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px; color: #0a0a0a;">✨ Así funciona:</h3>
          <p style="color: #525252; margin: 0; line-height: 1.8;">
            1. Respondé unas preguntas sobre tu workflow<br/>
            2. La IA genera tu Skill<br/>
            3. Probala con tests automáticos<br/>
            4. Publicala para la comunidad
          </p>
        </div>
        <a href="https://pymaiaskills.lovable.app/crear-skill" style="display: inline-block; background: #0a0a0a; color: #fafafa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Crear mi Skill →
        </a>
        <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px;">Pymaia Skills</p>
      </div>
    `,
  }),

  post_install_day0: (data) => ({
    subject: `🎯 Instalaste "${data.skill_name}" — Primeros pasos`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <img src="https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" alt="Pymaia Skills" width="40" height="40" style="height: 40px; width: 40px; display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a;">¡Excelente elección!</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.6;">
          Instalaste <strong>${data.skill_name || 'tu nueva Skill'}</strong>. 
          Acá te dejamos tips para sacarle el máximo provecho:
        </p>
        <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="color: #525252; line-height: 1.8; margin: 0;">
            ✅ Probala con un caso real de tu trabajo<br/>
            ✅ Ajustá los parámetros a tu contexto<br/>
            ✅ Compartí feedback para mejorarla
          </p>
        </div>
        <p style="color: #525252; font-size: 16px;">
          ¿Necesitás ayuda? Respondé a este email.
        </p>
        <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px;">Pymaia Skills</p>
      </div>
    `,
  }),

  post_install_day3: (data) => ({
    subject: `⭐ ¿Cómo te fue con "${data.skill_name}"?`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <img src="https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" alt="Pymaia Skills" width="40" height="40" style="height: 40px; width: 40px; display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a;">¿Cómo te fue?</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.6;">
          Hace 3 días instalaste <strong>${data.skill_name || 'una Skill'}</strong>. 
          Tu opinión nos ayuda a mejorar.
        </p>
        <a href="https://pymaiaskills.lovable.app/skill/${data.skill_slug || ''}" style="display: inline-block; background: #0a0a0a; color: #fafafa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Dejá tu reseña ⭐ →
        </a>
        ${!data.is_registered ? `
        <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px; color: #0a0a0a;">🔑 Creá tu cuenta gratis</h3>
          <p style="color: #525252; margin: 0;">
            Registrate para guardar tus Skills, dejar reseñas y crear las tuyas propias.
          </p>
          <a href="https://pymaiaskills.lovable.app/auth" style="color: #2563eb; text-decoration: underline; margin-top: 8px; display: inline-block;">Registrarme →</a>
        </div>
        ` : ''}
        <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px;">Pymaia Skills</p>
      </div>
    `,
  }),

  post_install_day7: (data) => ({
    subject: "🔥 Skills recomendadas para vos",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <img src="https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" alt="Pymaia Skills" width="40" height="40" style="height: 40px; width: 40px; display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a;">Más Skills para tu stack</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.6;">
          Ya probaste ${data.skill_name || 'Skill Creator'}. 
          Basado en tu interés, te recomendamos explorar más:
        </p>
        <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">📊 Data Analyst Pro</p>
          <p style="color: #737373; margin: 4px 0 0;">Análisis de datos con lenguaje natural</p>
        </div>
        <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">✍️ Content Writer</p>
          <p style="color: #737373; margin: 4px 0 0;">Generación de contenido optimizado para SEO</p>
        </div>
        <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">📋 Project Manager AI</p>
          <p style="color: #737373; margin: 4px 0 0;">Gestión de proyectos con IA integrada</p>
        </div>
        <a href="https://pymaiaskills.lovable.app/explorar" style="display: inline-block; background: #0a0a0a; color: #fafafa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">
          Descubrir más Skills →
        </a>
        <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px;">Pymaia Skills</p>
      </div>
    `,
  }),

  reengagement: (_data) => ({
    subject: "👋 Te extrañamos — Nuevas Skills disponibles",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <img src="https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png" alt="Pymaia Skills" width="40" height="40" style="height: 40px; width: 40px; display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a;">Hay novedades esperándote</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.6;">
          Hace un tiempo que no te vemos por Pymaia Skills. 
          Agregamos nuevas Skills que podrían interesarte.
        </p>
        <a href="https://pymaiaskills.lovable.app/explorar" style="display: inline-block; background: #0a0a0a; color: #fafafa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Ver novedades →
        </a>
        <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px;">
          <a href="https://pymaiaskills.lovable.app/unsubscribe" style="color: #a3a3a3;">Dejar de recibir emails</a>
        </p>
      </div>
    `,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { email, sequence_name, metadata } = await req.json();

    if (!email || !sequence_name) {
      throw new Error("Missing email or sequence_name");
    }

    // Find the sequence
    const { data: sequence, error: seqErr } = await supabase
      .from("email_sequences")
      .select("*")
      .eq("name", sequence_name)
      .eq("active", true)
      .single();

    if (seqErr || !sequence) {
      throw new Error(`Sequence "${sequence_name}" not found or inactive`);
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from("sequence_enrollments")
      .select("id")
      .eq("email", email)
      .eq("sequence_id", sequence.id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Already enrolled", enrollment_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enroll
    const { data: enrollment, error: enrollErr } = await supabase
      .from("sequence_enrollments")
      .insert({
        email,
        sequence_id: sequence.id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (enrollErr) throw enrollErr;

    // Schedule all steps
    const steps = sequence.steps as Array<{
      template: string;
      delay_days: number;
      subject?: string;
    }>;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const templateFn = templates[step.template];
      if (!templateFn) {
        console.warn(`Template "${step.template}" not found, skipping step ${i}`);
        continue;
      }

      const { subject, html } = templateFn({ ...metadata, email });

      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + step.delay_days);

      await supabase.from("email_queue").insert({
        to_email: email,
        subject: step.subject || subject,
        html_body: html,
        sequence_id: sequence.id,
        step_index: i,
        scheduled_at: scheduledAt.toISOString(),
        metadata: { sequence_name, ...metadata },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        enrollment_id: enrollment.id,
        steps_scheduled: steps.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("enroll-sequence error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
