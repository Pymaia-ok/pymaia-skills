import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

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
  if (!root || root.childElementCount > 0) return; // already rendered
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

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <App />
  </ThemeProvider>
);
