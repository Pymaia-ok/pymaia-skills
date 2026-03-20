import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";
import { validateAdminRequest, unauthorizedResponse } from "../_shared/admin-auth.ts";

// Category-specific visual styles — each category has its own distinct look
const categoryStyles: Record<string, string[]> = {
  productivity: [
    "Flat-lay photograph of a colorful organized desk with sticky notes, pens, notebook, and coffee cup, top-down view, bright natural light",
    "Close-up photograph of hands writing in a bullet journal with colorful markers, shallow depth of field, warm tones",
    "Lifestyle photograph of a minimalist workspace with a large monitor showing charts, succulent plant, morning sunlight streaming in",
  ],
  agents: [
    "Close-up photograph of a smartphone screen showing a chat interface, blurred cozy background, warm ambient light",
    "Over-the-shoulder photograph of a person interacting with a laptop displaying a conversational AI interface, modern room",
    "Macro photograph of a robotic hand gently touching a human hand, soft studio lighting, warm skin tones, editorial style",
  ],
  industry: [
    "Environmental portrait of a lawyer reviewing documents at a mahogany desk, natural window light, warm professional tones",
    "Wide-angle photograph of a modern warehouse with automated systems, industrial lighting, clean lines",
    "Candid photograph of medical professionals collaborating around a tablet in a bright hospital corridor",
  ],
  security: [
    "Close-up photograph of a brass padlock on a weathered wooden door, shallow depth of field, moody blue-toned lighting",
    "Photograph of a clean server room with blue LED lights reflecting on polished floors, symmetrical composition",
    "Detail photograph of hands typing on a backlit keyboard in a dark room, screen glow on face, calm blue tones",
  ],
  mcp: [
    "Macro photograph of colorful USB-C cables and connectors neatly arranged on a white surface, product photography style",
    "Close-up photograph of ethernet cables plugged into a network switch with green status LEDs, shallow depth of field",
    "Bird's-eye photograph of a developer's desk with multiple screens showing API dashboards, organized cables, warm light",
  ],
};

const compositions = [
  "Shot with 35mm lens, rule of thirds composition.",
  "Tight close-up with bokeh background.",
  "Wide establishing shot showing full environment.",
  "Over-the-shoulder perspective, natural framing.",
  "Symmetrical centered composition, clean lines.",
];

const defaultStyles = [
  "Editorial-style photograph, warm natural lighting, real-world setting",
  "Minimalist product photography, soft shadows, clean background",
  "Lifestyle photograph, golden hour light, authentic moment",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Admin auth guard
  const auth = validateAdminRequest(req);
  if (!auth.authorized) return unauthorizedResponse(req, auth.reason);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit: max 5 regenerations per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentRuns } = await supabase
      .from("automation_logs")
      .select("id", { count: "exact", head: true })
      .eq("function_name", "regen-blog-covers")
      .gte("created_at", oneHourAgo);
    if ((recentRuns ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Rate limit: max 5 cover regenerations/hour" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get posts ordered by oldest updated_at
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, title, category")
      .eq("status", "published")
      .order("updated_at", { ascending: true })
      .limit(30);

    if (!posts?.length) {
      return new Response(JSON.stringify({ message: "No posts found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetSlug = body.slug;

    const postsToProcess = targetSlug
      ? posts.filter((p: any) => p.slug === targetSlug)
      : posts.slice(0, 1);

    const results = [];

    for (const post of postsToProcess) {
      // Pick a category-specific style or fallback
      const styles = categoryStyles[post.category] || defaultStyles;
      const style = styles[Math.floor(Math.random() * styles.length)];
      const composition = compositions[Math.floor(Math.random() * compositions.length)];

      // Extract 2-3 keywords from title for topic specificity
      const titleKeywords = post.title
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w: string) => w.length > 4)
        .slice(0, 3)
        .join(", ");

      const imagePrompt = `${style} ${composition} The scene relates to: ${titleKeywords}. MUST be photorealistic like a real stock photograph. Absolutely NO illustrations, NO digital art, NO neon glow, NO futuristic sci-fi elements, NO cartoon, NO infographics, NO text overlays, NO tech diagrams. Real objects, real lighting, warm natural colors.`;

      console.log(`Generating cover for: ${post.slug} (category: ${post.category})`);

      const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResponse.ok) {
        console.error(`Image gen failed for ${post.slug}:`, imgResponse.status);
        results.push({ slug: post.slug, status: "error", code: imgResponse.status });
        continue;
      }

      const imgResult = await imgResponse.json();
      const base64 = imgResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!base64) {
        console.error(`No image data for ${post.slug}`);
        results.push({ slug: post.slug, status: "no_image" });
        continue;
      }

      const raw = base64.includes(",") ? base64.split(",")[1] : base64;
      const imageBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const imagePath = `${post.slug}.jpg`;

      // Upload and CHECK for errors before updating DB
      const { error: uploadError } = await supabase.storage
        .from("blog-covers")
        .upload(imagePath, imageBytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload failed for ${post.slug}:`, uploadError.message);
        results.push({ slug: post.slug, status: "upload_error", error: uploadError.message });
        continue;
      }

      const { data: publicUrl } = supabase.storage.from("blog-covers").getPublicUrl(imagePath);
      const coverUrl = publicUrl?.publicUrl || null;

      if (coverUrl) {
        // Append cache-buster so browsers pick up the new image
        const urlWithBuster = `${coverUrl}?v=${Date.now()}`;
        await supabase.from("blog_posts").update({ cover_image_url: urlWithBuster }).eq("slug", post.slug);
        results.push({ slug: post.slug, status: "ok", url: urlWithBuster });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regen-blog-covers error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
