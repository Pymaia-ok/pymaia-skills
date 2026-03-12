import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Download, Terminal, Upload, FileCode, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import JSZip from "jszip";

interface GeneratedSkill {
  name: string;
  tagline: string;
  description: string;
  triggers: string[];
  instructions: string;
  examples: { title: string; input: string; output: string }[];
  dont_do: string[];
  edge_cases: string[];
  category: string;
  industry: string[];
  target_roles: string[];
  install_command: string;
}

interface SkillPlaygroundProps {
  skill: GeneratedSkill;
  onBack: () => void;
  onRefine: () => void;
}

export default function SkillPlayground({ skill, onBack, onRefine }: SkillPlaygroundProps) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const copyInstallCommand = () => {
    const cmd = `claude skill add "${slug}"`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    toast.success("Comando copiado al portapapeles");
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const copySkillMd = () => {
    navigator.clipboard.writeText(skill.install_command);
    setCopiedMd(true);
    toast.success("SKILL.md copiado al portapapeles");
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    zip.file(`${slug}/SKILL.md`, skill.install_command);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP descargado — subilo a Claude.ai en Settings → Features");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground truncate">{skill.name}</h2>
            <Badge variant="secondary" className="gap-1 shrink-0">
              <Terminal className="w-3 h-3" /> Probar en Claude
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">Instalá tu skill en Claude para probarla con todas sus capacidades</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefine} className="text-xs shrink-0">
          Refinar skill
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary mb-2">
            <Terminal className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Probá tu skill en tu agente AI</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tu skill está lista. Instalala en Claude Code con un comando, o exportala para cualquier agente compatible con Skills 2.0.
          </p>
        </motion.div>

        {/* Option 1: Claude Code */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Claude Code</h3>
            <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Copiá el archivo SKILL.md y pegalo en tu proyecto, o usá el comando de instalación.
          </p>
          <div className="flex gap-2">
            <Button onClick={copySkillMd} variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
              {copiedMd ? <Check className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
              {copiedMd ? "Copiado" : "Copiar SKILL.md"}
            </Button>
            <Button onClick={copyInstallCommand} variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
              {copiedCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedCmd ? "Copiado" : "Copiar comando"}
            </Button>
          </div>
        </motion.div>

        {/* Option 2: Claude.ai */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Claude.ai</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Descargá el ZIP y subilo manualmente en Claude.ai → Settings → Features → Agent Skills.
          </p>
          <div className="flex gap-2">
            <Button onClick={downloadZip} size="sm" className="gap-1.5 text-xs flex-1">
              <Download className="w-3 h-3" /> Descargar ZIP
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => window.open("https://claude.ai/settings", "_blank")}
            >
              <ExternalLink className="w-3 h-3" /> Abrir Claude.ai
            </Button>
          </div>
        </motion.div>

        {/* SKILL.md preview */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" /> Vista previa del archivo
          </h3>
          <pre className="p-4 bg-secondary rounded-xl text-xs text-foreground overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap font-mono">
            {skill.install_command}
          </pre>
        </motion.div>

        {/* Back button */}
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={onBack} className="text-sm text-muted-foreground">
            ← Volver a la preview
          </Button>
        </div>
      </div>
    </div>
  );
}
