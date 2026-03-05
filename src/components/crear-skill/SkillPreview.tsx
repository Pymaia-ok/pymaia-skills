import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, Send, Loader2, Zap, ShieldAlert, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SkillScoreCard from "./SkillScoreCard";

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

interface Quality {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface SkillPreviewProps {
  skill: GeneratedSkill;
  quality: Quality;
  onRefine: (request: string) => Promise<void>;
  onPublish: () => void;
  onBack: () => void;
  isRefining: boolean;
}

export default function SkillPreview({ skill, quality, onRefine, onPublish, onBack, isRefining }: SkillPreviewProps) {
  const [refinement, setRefinement] = useState("");

  const handleRefine = async () => {
    if (!refinement.trim()) return;
    await onRefine(refinement.trim());
    setRefinement("");
  };

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
                <span className="text-red-500 mt-0.5">✕</span> {d}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

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
        <Button onClick={onPublish} className="flex-1 rounded-full gap-2" size="lg">
          <Sparkles className="w-4 h-4" /> Publicar skill
        </Button>
      </div>
    </div>
  );
}
