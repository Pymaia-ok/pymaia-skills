import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { type, file_path, url, user_id } = await req.json();

    let extractedText = "";

    if (type === "url") {
      // Process URL (YouTube, website, social media)
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      
      if (FIRECRAWL_API_KEY && !isYouTubeUrl(url)) {
        // Use Firecrawl for general URLs
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });
        const data = await response.json();
        extractedText = data.data?.markdown || data.markdown || "";
        if (!extractedText) {
          extractedText = `Contenido extraído de: ${url}\n\n${JSON.stringify(data, null, 2)}`;
        }
      } else if (isYouTubeUrl(url)) {
        // For YouTube, extract video ID and use AI to understand context
        const videoId = extractYouTubeId(url);
        extractedText = `[Video de YouTube: ${url}]\nVideo ID: ${videoId}\n\nEl usuario compartió un video de YouTube. Pedile que te describa el contenido del video para poder extraer su expertise.`;
      } else {
        // Fallback: fetch HTML directly
        try {
          const resp = await fetch(url);
          const html = await resp.text();
          // Strip HTML tags for basic text extraction
          extractedText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 10000);
        } catch {
          extractedText = `No se pudo acceder al contenido de: ${url}. Pedile al usuario que copie y pegue el contenido relevante.`;
        }
      }
    } else if (type === "file") {
      // Process uploaded file from storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("skill-uploads")
        .download(file_path);

      if (downloadError) throw new Error(`Error downloading file: ${downloadError.message}`);

      const fileName = file_path.split("/").pop() || "";
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      
      const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];
      const videoExts = ["mp4", "mov", "avi", "webm", "mkv"];
      const docExts = ["pdf", "doc", "docx", "txt", "md", "csv", "json"];

      if (imageExts.includes(ext)) {
        // Process image with AI vision
        const base64 = await arrayBufferToBase64(await fileData.arrayBuffer());
        const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Analizá esta imagen que el usuario subió para crear una skill. Extraé toda la información relevante: procesos, pasos, instrucciones, reglas, diagramas, textos visibles, etc. Respondé en español con el contenido extraído de forma estructurada.",
              },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
                  { type: "text", text: "Extraé toda la información relevante de esta imagen para crear una skill de Claude." },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Vision API error:", response.status, errText);
          throw new Error(`Error procesando imagen: ${response.status}`);
        }

        const data = await response.json();
        extractedText = `[Contenido extraído de imagen: ${fileName}]\n\n${data.choices[0].message.content}`;
      } else if (videoExts.includes(ext)) {
        // For videos, we can't process directly but can guide the user
        extractedText = `[Video subido: ${fileName}]\n\nSe subió un archivo de video. Por ahora, pedile al usuario que describa el contenido del video paso a paso para poder extraer la información y crear la skill.`;
      } else if (docExts.includes(ext)) {
        // Process text-based documents
        if (ext === "pdf") {
          // PDF: extract text with AI vision (render as image-like)
          // For now, try to extract raw text
          const text = await fileData.text();
          if (text && text.length > 50 && !text.includes('\x00')) {
            extractedText = `[Contenido de documento: ${fileName}]\n\n${text.slice(0, 15000)}`;
          } else {
            // Binary PDF - use base64 with AI
            const base64 = await arrayBufferToBase64(await fileData.arrayBuffer());
            extractedText = `[Documento PDF subido: ${fileName}]\n\nEl archivo PDF fue subido correctamente. Pedile al usuario que copie y pegue el contenido más relevante del documento, o que describa los pasos/procesos que contiene.`;
          }
        } else {
          // Text-based files
          const text = await fileData.text();
          extractedText = `[Contenido de documento: ${fileName}]\n\n${text.slice(0, 15000)}`;
        }
      } else {
        extractedText = `[Archivo subido: ${fileName}]\n\nTipo de archivo no reconocido. Pedile al usuario que describa el contenido del archivo.`;
      }
    }

    // Summarize with AI if text is very long
    if (extractedText.length > 5000) {
      const summaryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "Resumí el siguiente contenido extrayendo SOLO la información relevante para crear una skill de Claude: procesos, pasos, reglas, instrucciones, ejemplos, qué hacer y qué no hacer. Sé conciso pero completo. Respondé en español.",
            },
            { role: "user", content: extractedText },
          ],
        }),
      });

      if (summaryResp.ok) {
        const summaryData = await summaryResp.json();
        extractedText = summaryData.choices[0].message.content;
      }
    }

    return new Response(
      JSON.stringify({ extracted_text: extractedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-attachment error:", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:v=|\/)([\w-]{11})/);
  return match?.[1] || "";
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
