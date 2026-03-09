import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import SkillDetail from "./pages/SkillDetail";
import PrimerosPasos from "./pages/PrimerosPasos";
import Auth from "./pages/Auth";
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explorar" element={<Explore />} />
            <Route path="/skill/:slug" element={<SkillDetail />} />
            <Route path="/primeros-pasos" element={<PrimerosPasos />} />
            <Route path="/auth" element={<Auth />} />
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
            <Route path="/admin" element={<Admin />} />
            <Route path="/terminos" element={<Terms />} />
            <Route path="/privacidad" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
