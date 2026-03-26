import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const FALLBACK_SUPABASE_URL = "https://zugqvdqactbhzlilwyds.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3F2ZHFhY3RiaHpsaWx3eWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzI3MjUsImV4cCI6MjA4ODE0ODcyNX0.zwmNMXvqjdn_5m2vfrsgWpdavwiH_4n8nLMq5huLfMg";

// Build define overrides only when process.env provides non-VITE alternatives
// (e.g. SUPABASE_URL without the VITE_ prefix). When absent, Vite reads .env natively.
function envDefines(): Record<string, string> {
  const defs: Record<string, string> = {};

  const url = process.env.SUPABASE_URL;
  defs["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(
    url || FALLBACK_SUPABASE_URL
  );

  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  defs["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(
    key || FALLBACK_SUPABASE_PUBLISHABLE_KEY
  );

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
