import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stylePool = [
  "Clean flat-lay photograph, top-down view, minimal props on a light desk",
  "Realistic photograph of a professional workspace, natural lighting, shallow depth of field",
  "Editorial-style photograph, candid business setting, warm tones",
  "Minimalist product photography style, clean background, soft shadows",
  "Photojournalistic style, real people in an office environment, natural colors",
  "Bird's-eye view photograph of organized desk items, muted color palette",
  "Lifestyle photograph, cozy workspace with laptop and coffee, golden hour light",
  "Corporate photography style, modern open office, natural daylight",
];

const categoryHints: Record<string, string> = {
  productivity: "showing real tools, notebooks, screens with charts, organized workspace",
  agents: "showing a person interacting with a laptop or phone, conversational UI on screen",
  industry: "showing professionals in their work environment, real-world business context",
  security: "showing a lock, shield icon, or secure workspace, calm and trustworthy mood",
  mcp: "showing connected devices, cables, dashboard screens, integration concept",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get the post with oldest updated_at (cycles through all)
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
      : posts.slice(0, 1); // oldest updated_at first

    const results = [];

    for (const post of postsToProcess) {
      const hint = categoryHints[post.category] || "showing a modern professional workspace";
      const style = stylePool[Math.floor(Math.random() * stylePool.length)];
      const imagePrompt = `${style}, ${hint}. Topic: ${post.title}. MUST be photorealistic like a stock photograph. Absolutely NO illustrations, NO digital art, NO neon glow, NO futuristic elements, NO sci-fi, NO cartoon, NO infographics, NO text overlays, NO tech diagrams. Real people, real objects, real lighting. Warm natural colors, shallow depth of field, real-world setting.`;

      console.log(`Generating cover for: ${post.slug}`);

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

      await supabase.storage.from("blog-covers").upload(imagePath, imageBytes, {
        contentType: "image/jpeg",
        upsert: true,
      });

      const { data: publicUrl } = supabase.storage.from("blog-covers").getPublicUrl(imagePath);
      const coverUrl = publicUrl?.publicUrl || null;

      if (coverUrl) {
        await supabase.from("blog_posts").update({ cover_image_url: coverUrl }).eq("slug", post.slug);
        results.push({ slug: post.slug, status: "ok", url: coverUrl });
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
