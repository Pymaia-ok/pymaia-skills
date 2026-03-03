import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server/mcp`;

const mcpConfig = JSON.stringify(
  {
    mcpServers: {
      skillhub: {
        type: "streamable-http",
        url: MCP_URL,
      },
    },
  },
  null,
  2
);

const chatExamples = [
  {
    user: "Tengo que preparar 10 briefs de campaña para mañana",
    claude:
      "Encontré 2 skills perfectas para esto:\n\n• Brief Generator (⭐ 4.9, 1.2k usuarios) — Generá briefs de campaña en 3 minutos\n• Campaign Planner (⭐ 4.7, 890 usuarios) — Planificá campañas completas\n\n¿Querés que te ayude a instalar alguna?",
  },
  {
    user: "Necesito revisar un contrato de servicios antes de firmarlo",
    claude:
      "Te recomiendo Contract Reviewer (⭐ 4.8, 892 usuarios). Analiza contratos, identifica cláusulas de riesgo y te da un resumen ejecutivo claro. Se instala en 2 minutos. ¿La instalamos?",
  },
  {
    user: "¿Qué skills están usando más los marketers esta semana?",
    claude:
      "Las skills más populares en marketing esta semana:\n\n1. Social Media Planner — 2.8k instalaciones\n2. Email Crafter — 3.2k instalaciones\n3. SEO Content Optimizer — 2.1k instalaciones\n\nCada una se instala en 2 minutos sin tocar terminal.",
  },
];

const MCP = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 max-w-3xl mx-auto px-6 py-24">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
          <h1 className="hero-title mb-6">
            Que Claude te recomiende
            <br />
            skills mientras trabajás.
          </h1>
          <p className="hero-subtitle max-w-lg mx-auto">
            Instalá el MCP Server y Claude va a sugerir skills relevantes automáticamente, según lo que estés haciendo.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground">
            Compatible con Claude Code, Cursor y más
          </div>
        </motion.div>

        {/* Installation */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-8">Instalación en 3 pasos</h2>
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">1</div>
              <div>
                <h3 className="font-semibold mb-2">Abrí la configuración de Claude Code</h3>
                <p className="text-sm text-muted-foreground">Andá a Settings → MCP Servers en Claude Code o Cursor.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">2</div>
              <div>
                <h3 className="font-semibold mb-2">Agregá esta configuración</h3>
                <p className="text-sm text-muted-foreground mb-3">Copiá y pegá este JSON en tu archivo de configuración de MCP:</p>
                <div className="relative p-4 rounded-xl bg-foreground text-background font-mono text-sm">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all">{mcpConfig}</pre>
                  <button onClick={handleCopy} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background/10 transition-colors">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">3</div>
              <div>
                <h3 className="font-semibold mb-2">¡Listo! Solo necesitás hacer esto una vez</h3>
                <p className="text-sm text-muted-foreground">La próxima vez que hables con Claude sobre una tarea, va a buscar skills relevantes automáticamente.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tools */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-8">Herramientas disponibles</h2>
          <div className="space-y-4">
            {[
              { name: "search_skills", desc: "Busca skills relevantes según lo que necesités hacer. Claude la usa automáticamente cuando le pedís ayuda con una tarea." },
              { name: "get_skill_details", desc: "Obtiene información detallada de una skill: descripción, casos de uso, instrucciones de instalación." },
              { name: "list_popular_skills", desc: "Lista las skills más populares del directorio, ordenadas por instalaciones o rating." },
            ].map((tool) => (
              <div key={tool.name} className="p-5 rounded-2xl bg-secondary">
                <code className="text-sm font-semibold font-mono">{tool.name}</code>
                <p className="text-sm text-muted-foreground mt-1">{tool.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Chat Examples */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-2xl font-semibold mb-8">Ejemplos de conversación</h2>
          <div className="space-y-6">
            {chatExamples.map((ex, i) => (
              <div key={i} className="rounded-2xl bg-secondary p-6">
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Vos</p>
                  <p className="text-sm font-medium">{ex.user}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Claude</p>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{ex.claude}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MCP;
