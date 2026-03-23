import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const backendUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://zugqvdqactbhzlilwyds.supabase.co";

const backendPublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3F2ZHFhY3RiaHpsaWx3eWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzI3MjUsImV4cCI6MjA4ODE0ODcyNX0.zwmNMXvqjdn_5m2vfrsgWpdavwiH_4n8nLMq5huLfMg";

const backendProjectId =
  process.env.VITE_SUPABASE_PROJECT_ID ??
  process.env.SUPABASE_PROJECT_ID ??
  "zugqvdqactbhzlilwyds";

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
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(backendUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(backendPublishableKey),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(backendProjectId),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
