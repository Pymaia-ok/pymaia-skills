import { motion } from "framer-motion";
import { Code, Plug, Workflow, Terminal, Bot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PluginTemplate = "skill" | "api-connector" | "workflow" | "slash-command" | "subagent";

interface TemplateOption {
  id: PluginTemplate;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  includes: string[];
  difficulty: "Fácil" | "Medio" | "Avanzado";
  example: string;
}

const templates: TemplateOption[] = [
  {
    id: "skill",
    icon: <Code className="w-6 h-6" />,
    title: "Skill simple",
    subtitle: "Plugin con un SKILL.md que automatiza un workflow de texto",
    includes: ["plugin.json", "SKILL.md"],
    difficulty: "Fácil",
    example: "Ej: Revisor de contratos, generador de emails",
  },
  {
    id: "api-connector",
    icon: <Plug className="w-6 h-6" />,
    title: "API Connector",
    subtitle: "Plugin que conecta a un servicio externo vía MCP server",
    includes: ["plugin.json", "SKILL.md", "MCP server", "package.json"],
    difficulty: "Medio",
    example: "Ej: Consultar CRM, enviar notificaciones a Slack",
  },
  {
    id: "workflow",
    icon: <Workflow className="w-6 h-6" />,
    title: "Workflow completo",
    subtitle: "Automatización end-to-end con múltiples skills + MCP + commands",
    includes: ["plugin.json", "skills/", "commands/", ".mcp.json"],
    difficulty: "Avanzado",
    example: "Ej: Pipeline CI/CD, flujo de onboarding completo",
  },
  {
    id: "slash-command",
    icon: <Terminal className="w-6 h-6" />,
    title: "Slash command",
    subtitle: "Comando rápido invocable con /nombre desde Claude",
    includes: ["plugin.json", "commands/"],
    difficulty: "Fácil",
    example: "Ej: /deploy, /review-pr, /create-ticket",
  },
  {
    id: "subagent",
    icon: <Bot className="w-6 h-6" />,
    title: "Subagente",
    subtitle: "Agente especializado que Claude invoca para tareas complejas",
    includes: ["plugin.json", "agents/", "skills/"],
    difficulty: "Avanzado",
    example: "Ej: Agente de QA, agente de seguridad, agente de datos",
  },
];

const difficultyColor: Record<string, string> = {
  "Fácil": "text-green-500 bg-green-500/10",
  "Medio": "text-yellow-500 bg-yellow-500/10",
  "Avanzado": "text-orange-500 bg-orange-500/10",
};

interface PluginTemplateSelectorProps {
  onSelect: (template: PluginTemplate) => void;
  onSkip: () => void;
}

export default function PluginTemplateSelector({ onSelect, onSkip }: PluginTemplateSelectorProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">¿Qué querés crear?</h1>
          <p className="text-muted-foreground mt-2">Elegí un template para empezar más rápido, o saltá directo al creador libre.</p>
        </div>

        <div className="grid gap-4">
          {templates.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(t.id)}
              className="group w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 hover:bg-secondary/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-secondary text-foreground shrink-0">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{t.title}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficultyColor[t.difficulty]}`}>
                      {t.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.subtitle}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{t.example}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.includes.map((inc) => (
                      <span key={inc} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {inc}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            </motion.button>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Saltear y empezar sin template →
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
