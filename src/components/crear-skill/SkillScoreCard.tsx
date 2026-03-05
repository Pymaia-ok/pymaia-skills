import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Quality {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export default function SkillScoreCard({ quality }: { quality: Quality }) {
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
        <div>
          <h3 className="font-semibold text-foreground">Score de calidad</h3>
          <p className="text-sm text-muted-foreground">{quality.feedback}</p>
        </div>
      </div>

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
