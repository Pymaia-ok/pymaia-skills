import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import SkillDetail from "./pages/SkillDetail";
import PrimerosPasos from "./pages/PrimerosPasos";
import Auth from "./pages/Auth";
import Publicar from "./pages/Publicar";
import UserProfile from "./pages/UserProfile";
import Teams from "./pages/Teams";
import MCP from "./pages/MCP";
import Admin from "./pages/Admin";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explorar" element={<Explore />} />
            <Route path="/skill/:slug" element={<SkillDetail />} />
            <Route path="/primeros-pasos" element={<PrimerosPasos />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/publicar" element={<Publicar />} />
            <Route path="/u/:username" element={<UserProfile />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/mcp" element={<MCP />} />
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
