import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "./index.css";

// ── Global error handlers: prevent silent blank screens ──
window.addEventListener("error", (e) => {
  console.error("[global error]", e.error || e.message);
  showCrashFallback(e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message || String(e.reason);
  console.error("[unhandled rejection]", msg);
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
    const [{ default: App }] = await Promise.all([
      import("./App.tsx"),
      import("./i18n"),
    ]);

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

    showCrashFallback(detail);
  }
}

void bootstrap();
