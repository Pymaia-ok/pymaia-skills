import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";

// Eagerly loaded (critical path)
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import SkillDetail from "./pages/SkillDetail";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded (heavy / less critical pages)
const PrimerosPasos = lazy(() => import("./pages/PrimerosPasos"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CrearSkill = lazy(() => import("./pages/CrearSkill"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Conectores = lazy(() => import("./pages/Conectores"));
const ConectorDetail = lazy(() => import("./pages/ConectorDetail"));
const MCP = lazy(() => import("./pages/MCP"));
const Admin = lazy(() => import("./pages/Admin"));
const MisSkills = lazy(() => import("./pages/MisSkills"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Plugins = lazy(() => import("./pages/Plugins"));
const PluginDetail = lazy(() => import("./pages/PluginDetail"));
const RoleLanding = lazy(() => import("./pages/RoleLanding"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const SecurityAdvisories = lazy(() => import("./pages/SecurityAdvisories"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseModule = lazy(() => import("./pages/CourseModule"));
const Links = lazy(() => import("./pages/Links"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="min-h-[70vh] w-full max-w-6xl mx-auto px-4 pt-12 space-y-8 animate-pulse">
    <div className="h-8 w-48 bg-muted rounded-md" />
    <div className="h-5 w-96 max-w-full bg-muted rounded-md" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-muted h-48" />
      ))}
    </div>
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
