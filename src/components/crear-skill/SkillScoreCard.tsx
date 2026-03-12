import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, CheckCircle2, Wand2, Loader2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Quality {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface Iteration {
  cycle: number;
  pass_rate: number;
  avg_score: number;
  critical_gaps: string[];
}

interface SkillScoreCardProps {
  quality: Quality;
  onAutoImprove?: () => void;
  isAutoImproving?: boolean;
  iterations?: Iteration[];
}

export default function SkillScoreCard({ quality, onAutoImprove, isAutoImproving, iterations }: SkillScoreCardProps) {
  const score = quality.score;
  const color = score >= 8 ? "text-green-500" : score >= 5 ? "text-yellow-500" : "text-red-500";
  const bgColor = score >= 8 ? "bg-green-500/10" : score >= 5 ? "bg-yellow-500/10" : "bg-red-500/10";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-2xl ${bgColor} flex items-center justify-center`}>
          <span className={`text-2xl font-bold ${color}`}>{score}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Score de calidad</h3>
          <p className="text-sm text-muted-foreground">{quality.feedback}</p>
        </div>
        {onAutoImprove && score < 9 && (
          <Button
            onClick={onAutoImprove}
            disabled={isAutoImproving}
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs shrink-0"
          >
            {isAutoImproving ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Mejorando...</>
            ) : (
              <><Wand2 className="w-3 h-3" /> Auto-mejorar</>
            )}
          </Button>
        )}
      </div>

      {/* Iteration history */}
      {iterations && iterations.length > 1 && (
        <div className="mb-4 p-3 rounded-xl bg-secondary/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Historial de mejora ({iterations.length} ciclos)
          </h4>
          <div className="flex gap-2">
            {iterations.map((iter, i) => (
              <div key={i} className="flex-1 text-center p-2 rounded-lg bg-background border border-border">
                <div className="text-[10px] text-muted-foreground">Ciclo {iter.cycle}</div>
                <div className={`text-sm font-bold ${iter.avg_score >= 8 ? "text-green-500" : iter.avg_score >= 5 ? "text-yellow-500" : "text-red-500"}`}>
                  {iter.avg_score.toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground">{Math.round(iter.pass_rate * 100)}% pass</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quality.strengths.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Fortalezas
          </h4>
          <ul className="space-y-1">
            {quality.strengths.map((s, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <TrendingUp className="w-3 h-3 mt-1 text-green-500 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {quality.improvements.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Mejoras sugeridas
          </h4>
          <ul className="space-y-1">
            {quality.improvements.map((s, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 mt-1 text-yellow-500 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
