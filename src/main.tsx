import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "./index.css";

const hasBackendEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function renderSafePreview(detail?: string) {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  rootEl.innerHTML = `
    <main style="min-height:100vh;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:2rem;">
      <section style="max-width:48rem;text-align:center;">
        <div style="display:inline-flex;margin-bottom:1.5rem;border:1px solid rgba(0,0,0,.1);background:rgba(0,0,0,.04);padding:.35rem .8rem;border-radius:999px;font-size:.875rem;color:rgba(0,0,0,.65);">
          Vista previa segura
        </div>
        <h1 style="font-size:clamp(2rem,5vw,4rem);line-height:1.05;letter-spacing:-0.04em;margin:0;">
          La app no se rompe aunque falte la configuración del backend.
        </h1>
        <p style="margin:1.25rem auto 0;max-width:40rem;font-size:1.125rem;line-height:1.7;color:rgba(0,0,0,.62);">
          En este entorno de preview no llegaron las variables del backend, así que cargué una vista degradada para evitar la pantalla en blanco.
        </p>
        ${detail ? `<p style="margin:1rem auto 0;max-width:42rem;border:1px solid rgba(0,0,0,.08);background:rgba(0,0,0,.03);border-radius:1rem;padding:.9rem 1rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.95rem;color:rgba(0,0,0,.65);word-break:break-word;">${detail}</p>` : ""}
        <div style="display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:2rem;">
          <button id="safe-preview-reload" style="padding:.8rem 1.35rem;border-radius:.9rem;border:1px solid #111;background:#111;color:#fff;cursor:pointer;font-size:1rem;">Recargar preview</button>
          <button id="safe-preview-published" style="padding:.8rem 1.35rem;border-radius:.9rem;border:1px solid rgba(0,0,0,.15);background:#fff;color:#111;cursor:pointer;font-size:1rem;">Ver sitio publicado</button>
        </div>
      </section>
    </main>
  `;

  document.getElementById("safe-preview-reload")?.addEventListener("click", () => {
    sessionStorage.removeItem("chunk_reload");
    window.location.reload();
  });

  document.getElementById("safe-preview-published")?.addEventListener("click", () => {
    window.open("https://pymaiaskills.lovable.app", "_blank", "noopener,noreferrer");
  });
}

// ── Global error handlers: prevent silent blank screens ──
window.addEventListener("error", (e) => {
  console.error("[global error]", e.error || e.message);
  if (String(e.message).includes("supabaseUrl is required.")) {
    void renderSafePreview("Vista previa cargada sin backend.");
    return;
  }
  showCrashFallback(e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message || String(e.reason);
  console.error("[unhandled rejection]", msg);
  if (msg.includes("supabaseUrl is required.")) {
    void renderSafePreview("Vista previa cargada sin backend.");
    return;
  }
  // Stale chunk / dynamic import failure → auto-reload once
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk")
  ) {
    const key = "chunk_reload";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
      return;
    }
  }
  showCrashFallback(msg);
});

async function hardRefreshApp(reason: string) {
  const key = `hard_refresh_${reason}`;
  if (sessionStorage.getItem(key)) {
    showCrashFallback(`Error persistente: ${reason}`);
    return;
  }

  sessionStorage.setItem(key, "1");

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((cacheKey) => caches.delete(cacheKey)));
    }
  } catch (error) {
    console.warn("[hard refresh] cleanup failed", error);
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("__lr", Date.now().toString());
  window.location.replace(nextUrl.toString());
}

function showCrashFallback(detail?: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:2rem;text-align:center">
      <div style="max-width:420px">
        <h1 style="font-size:2.5rem;margin-bottom:.5rem">😵</h1>
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">Algo salió mal</h2>
        <p style="color:#888;font-size:.875rem;margin-bottom:1.5rem">
          Ocurrió un error inesperado al cargar la app.
          ${detail ? `<br/><code style="font-size:.75rem;color:#c44">${detail.slice(0, 200)}</code>` : ""}
        </p>
        <button onclick="sessionStorage.removeItem('chunk_reload');location.reload()" style="padding:.625rem 1.5rem;border-radius:.75rem;border:1px solid #ccc;background:#111;color:#fff;cursor:pointer;font-size:.875rem">
          Recargar
        </button>
      </div>
    </div>
  `;
}

function showBootFallback(message = "Cargando aplicación…") {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:2rem;text-align:center;background:#fff;color:#111">
      <div style="max-width:420px">
        <div style="width:2.25rem;height:2.25rem;border-radius:9999px;border:3px solid rgba(0,0,0,.12);border-top-color:#111;margin:0 auto 1rem;animation:spin .8s linear infinite"></div>
        <p style="font-size:.95rem;color:#666">${message}</p>
      </div>
    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `;
}

async function bootstrap() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  showBootFallback();

  try {
    if (!hasBackendEnv) {
      await Promise.all([import("./i18n")]);
      await renderSafePreview("Vista previa cargada sin backend.");
      return;
    }

    const [{ default: App }] = await Promise.all([import("./App"), import("./i18n")]);

    createRoot(rootEl).render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <App />
      </ThemeProvider>
    );
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("[bootstrap error]", error);

    if (
      detail.includes("Failed to fetch dynamically imported module") ||
      detail.includes("Loading chunk") ||
      detail.includes("Importing a module script failed")
    ) {
      const key = "chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return;
      }
    }

    if (detail.includes("supabaseUrl is required.")) {
      await renderSafePreview("Vista previa cargada sin backend.");
      return;
    }

    showCrashFallback(detail);
  }
}

void bootstrap();
