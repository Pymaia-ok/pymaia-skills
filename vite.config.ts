import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Build define overrides only when process.env provides non-VITE alternatives
// (e.g. SUPABASE_URL without the VITE_ prefix). When absent, Vite reads .env natively.
function envDefines(): Record<string, string> {
  const defs: Record<string, string> = {};

  const url = process.env.SUPABASE_URL;
  if (url) defs["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(url);

  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (key) defs["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(key);

  const pid = process.env.SUPABASE_PROJECT_ID;
  if (pid) defs["import.meta.env.VITE_SUPABASE_PROJECT_ID"] = JSON.stringify(pid);

  return defs;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: envDefines(),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
