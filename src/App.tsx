import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import SkillDetail from "./pages/SkillDetail";
import PrimerosPasos from "./pages/PrimerosPasos";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import CrearSkill from "./pages/CrearSkill";
import UserProfile from "./pages/UserProfile";
import Conectores from "./pages/Conectores";
import ConectorDetail from "./pages/ConectorDetail";
import MCP from "./pages/MCP";
import Admin from "./pages/Admin";
import MisSkills from "./pages/MisSkills";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Plugins from "./pages/Plugins";
import PluginDetail from "./pages/PluginDetail";
import RoleLanding from "./pages/RoleLanding";
import Enterprise from "./pages/Enterprise";
import NotFound from "./pages/NotFound";
import SecurityAdvisories from "./pages/SecurityAdvisories";
import ApiDocs from "./pages/ApiDocs";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CourseModule from "./pages/CourseModule";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";

const queryClient = new QueryClient();

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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
