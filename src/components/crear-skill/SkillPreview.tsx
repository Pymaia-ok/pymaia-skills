import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, Send, Loader2, Zap, ShieldAlert, BookOpen, FlaskConical, Copy, Check, FileCode, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SkillScoreCard from "./SkillScoreCard";
import SkillTestResults from "./SkillTestResults";
import { toast } from "sonner";
import JSZip from "jszip";

interface RequiredMcp {
  name: string;
  description: string;
  url?: string;
  install_command?: string;
  required_tools: string[];
  credentials_needed?: string[];
  optional: boolean;
}

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
  required_mcps?: RequiredMcp[];
}

interface Quality {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface TestResults {
  test_results: {
    case_number: number;
    case_type: string;
    title: string;
    input: string;
    real_output: string;
    full_output?: string;
    passed: boolean;
    score: number;
    feedback: string;
  }[];
  overall_score: number;
  overall_feedback: string;
  critical_gaps: string[];
}

interface SkillPreviewProps {
  skill: GeneratedSkill;
  quality: Quality;
  testResults: TestResults | null;
  onRefine: (request: string) => Promise<void>;
  onPublish: () => void;
  onBack: () => void;
  onRunTests: () => void;
  onPlayground: () => void;
  isRefining: boolean;
  isTesting: boolean;
}

export default function SkillPreview({ skill, quality, testResults, onRefine, onPublish, onBack, onRunTests, onPlayground, isRefining, isTesting }: SkillPreviewProps) {
  const [refinement, setRefinement] = useState("");
  const [showSkillMd, setShowSkillMd] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySkillMd = () => {
    navigator.clipboard.writeText(skill.install_command);
    setCopied(true);
    toast.success("SKILL.md copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    const folderName = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    zip.file(`${folderName}/SKILL.md`, skill.install_command);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP descargado — subilo a Claude.ai en Settings → Features");
  };

  const handleRefine = async () => {
    if (!refinement.trim()) return;
    await onRefine(refinement.trim());
    setRefinement("");
  };

  const canPublish = !testResults || testResults.overall_score >= 7;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{skill.name}</h2>
          <p className="text-sm text-muted-foreground">{skill.tagline}</p>
        </div>
      </div>

      <SkillScoreCard quality={quality} />

      {/* Test Results */}
      <SkillTestResults results={testResults} onRunTests={onRunTests} isTesting={isTesting} />

      {/* Description */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Descripción</h3>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{skill.description}</p>
      </motion.div>

      {/* Triggers */}
      {skill.triggers.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Triggers
          </h3>
          <div className="flex flex-wrap gap-2">
            {skill.triggers.map((t, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-secondary text-xs text-foreground">{t}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Examples */}
      {skill.examples.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Ejemplos
          </h3>
          <div className="space-y-4">
            {skill.examples.map((ex, i) => (
              <div key={i} className="space-y-2">
                <p className="text-xs font-medium text-foreground">{ex.title}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Input</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{ex.input}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Output</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{ex.output}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Don'ts */}
      {skill.dont_do.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Qué NO hacer
          </h3>
          <ul className="space-y-1.5">
            {skill.dont_do.map((d, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-destructive mt-0.5">✕</span> {d}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Required MCPs */}
      {skill.required_mcps && skill.required_mcps.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.27 }} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            🔌 Dependencias externas
          </h3>
          <div className="space-y-3">
            {skill.required_mcps.map((mcp, i) => (
              <div key={i} className="bg-secondary rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">{mcp.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${mcp.optional ? "bg-muted text-muted-foreground" : "bg-foreground/10 text-foreground font-medium"}`}>
                    {mcp.optional ? "opcional" : "requerido"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{mcp.description}</p>
                {mcp.required_tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mcp.required_tools.map((tool, ti) => (
                      <code key={ti} className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">{tool}</code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* SKILL.md Preview */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" /> SKILL.md
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSkillMd(!showSkillMd)} className="text-xs h-7">
              {showSkillMd ? "Ocultar" : "Ver archivo"}
            </Button>
            <Button variant="outline" size="sm" onClick={copySkillMd} className="text-xs h-7 gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadZip} className="text-xs h-7 gap-1">
              <Download className="w-3 h-3" /> ZIP
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Archivo compatible con el estándar oficial Agent Skills de Anthropic. Funciona en Claude Code, Claude.ai (subí el ZIP) y la API.
        </p>
        {showSkillMd && (
          <pre className="mt-3 p-4 bg-secondary rounded-xl text-xs text-foreground overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap font-mono">
            {skill.install_command}
          </pre>
        )}
      </motion.div>

      {/* Refine input */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">¿Querés mejorar algo?</h3>
        <div className="flex gap-2 items-end">
          <Textarea
            value={refinement}
            onChange={(e) => setRefinement(e.target.value)}
            placeholder="Ej: Agregá más ejemplos, cambiá el tono, agregá un caso edge sobre..."
            className="min-h-[44px] max-h-[100px] resize-none rounded-xl"
            rows={1}
            disabled={isRefining}
          />
          <Button onClick={handleRefine} disabled={!refinement.trim() || isRefining} size="icon" className="rounded-xl shrink-0">
            {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onPlayground}
          variant="outline"
          className="flex-1 rounded-full gap-2"
          size="lg"
        >
          <FlaskConical className="w-4 h-4" /> Probar mi skill
        </Button>
        <Button
          onClick={onPublish}
          disabled={!canPublish}
          className="flex-1 rounded-full gap-2"
          size="lg"
        >
          <Sparkles className="w-4 h-4" /> Publicar skill
        </Button>
      </div>

      {!canPublish && testResults && (
        <p className="text-xs text-center text-muted-foreground">
          El score de testing es menor a 7/10. Mejorá tu skill antes de publicar.
        </p>
      )}
    </div>
  );
}
