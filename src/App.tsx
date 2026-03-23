import { lazy, Suspense, Component, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";
import { Loader2 } from "lucide-react";

// Eagerly loaded (critical path)
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import SkillDetail from "./pages/SkillDetail";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// ── Resilient lazy loader: auto-reloads on stale chunks ──
function resilientLazy(factory: () => Promise<{ default: any }>) {
  return lazy(() =>
    factory().catch((err) => {
      const key = "chunk_reload";
      if (
        !sessionStorage.getItem(key) &&
        (err?.message?.includes("Failed to fetch dynamically imported module") ||
          err?.message?.includes("Loading chunk"))
      ) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
      throw err;
    })
  );
}

// Lazy loaded (heavy / less critical pages)
const PrimerosPasos = resilientLazy(() => import("./pages/PrimerosPasos"));
const ResetPassword = resilientLazy(() => import("./pages/ResetPassword"));
const CrearSkill = resilientLazy(() => import("./pages/CrearSkill"));
const UserProfile = resilientLazy(() => import("./pages/UserProfile"));
const Conectores = resilientLazy(() => import("./pages/Conectores"));
const ConectorDetail = resilientLazy(() => import("./pages/ConectorDetail"));
const MCP = resilientLazy(() => import("./pages/MCP"));
const Admin = resilientLazy(() => import("./pages/Admin"));
const MisSkills = resilientLazy(() => import("./pages/MisSkills"));
const Terms = resilientLazy(() => import("./pages/Terms"));
const Privacy = resilientLazy(() => import("./pages/Privacy"));
const Plugins = resilientLazy(() => import("./pages/Plugins"));
const PluginDetail = resilientLazy(() => import("./pages/PluginDetail"));
const RoleLanding = resilientLazy(() => import("./pages/RoleLanding"));
const Enterprise = resilientLazy(() => import("./pages/Enterprise"));
const SecurityAdvisories = resilientLazy(() => import("./pages/SecurityAdvisories"));
const ApiDocs = resilientLazy(() => import("./pages/ApiDocs"));
const Blog = resilientLazy(() => import("./pages/Blog"));
const BlogPost = resilientLazy(() => import("./pages/BlogPost"));
const Courses = resilientLazy(() => import("./pages/Courses"));
const CourseDetail = resilientLazy(() => import("./pages/CourseDetail"));
const CourseModule = resilientLazy(() => import("./pages/CourseModule"));
const Links = resilientLazy(() => import("./pages/Links"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="min-h-[70vh] flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Navbar />
          <ErrorBoundary>
            <Suspense fallback={<LazyFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/explorar" element={<Explore />} />
                <Route path="/skill/:slug" element={<SkillDetail />} />
                <Route path="/primeros-pasos" element={<PrimerosPasos />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/crear-skill" element={<CrearSkill />} />
                <Route path="/publicar" element={<Navigate to="/crear-skill" replace />} />
                <Route path="/crear" element={<Navigate to="/crear-skill" replace />} />
                <Route path="/mis-skills" element={<MisSkills />} />
                <Route path="/u/:username" element={<UserProfile />} />
                <Route path="/mcp" element={<MCP />} />
                <Route path="/conectores" element={<Conectores />} />
                <Route path="/conector/:slug" element={<ConectorDetail />} />
                <Route path="/plugins" element={<Plugins />} />
                <Route path="/plugin/:slug" element={<PluginDetail />} />
                <Route path="/para/:roleSlug" element={<RoleLanding />} />
                <Route path="/enterprise" element={<Enterprise />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/seguridad" element={<SecurityAdvisories />} />
                <Route path="/api-docs" element={<ApiDocs />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/cursos" element={<Courses />} />
                <Route path="/curso/:slug" element={<CourseDetail />} />
                <Route path="/curso/:slug/:moduleOrder" element={<CourseModule />} />
                <Route path="/security" element={<Navigate to="/seguridad" replace />} />
                <Route path="/terminos" element={<Terms />} />
                <Route path="/privacidad" element={<Privacy />} />
                {/* English aliases for LLM discoverability */}
                <Route path="/skills" element={<Navigate to="/explorar" replace />} />
                <Route path="/connectors" element={<Navigate to="/conectores" replace />} />
                <Route path="/explore" element={<Navigate to="/explorar" replace />} />
                <Route path="/getting-started" element={<Navigate to="/primeros-pasos" replace />} />
                <Route path="/courses" element={<Navigate to="/cursos" replace />} />
                <Route path="/course/:slug" element={<Navigate to="/cursos" replace />} />
                <Route path="/links" element={<Links />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
