import { motion } from "framer-motion";
import { CheckCircle2, XCircle, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestCase {
  case_number: number;
  case_type: string;
  title: string;
  input: string;
  real_output: string;
  full_output?: string;
  passed: boolean;
  score: number;
  feedback: string;
}

interface TestResults {
  test_results: TestCase[];
  overall_score: number;
  overall_feedback: string;
  critical_gaps: string[];
}

interface SkillTestResultsProps {
  results: TestResults | null;
  onRunTests: () => void;
  isTesting: boolean;
}

export default function SkillTestResults({ results, onRunTests, isTesting }: SkillTestResultsProps) {
  if (!results) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5" /> Testing automático
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ejecutamos 5 casos de prueba reales contra tu skill: generamos inputs, obtenemos el output real del modelo, y un evaluador AI califica los resultados.
        </p>
        <Button onClick={onRunTests} disabled={isTesting} variant="outline" className="rounded-full gap-2">
          {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
          {isTesting ? "Testeando..." : "Correr tests automáticos"}
        </Button>
      </motion.div>
    );
  }

  const passed = results.test_results.filter((t) => t.passed).length;
  const total = results.test_results.length;
  const scoreColor = results.overall_score >= 8 ? "text-green-500" : results.overall_score >= 5 ? "text-yellow-500" : "text-red-500";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5" /> Resultados del test
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${scoreColor}`}>{passed}/{total}</span>
          <span className="text-xs text-muted-foreground">pasaron</span>
        </div>
      </div>

      <p className="text-sm text-foreground">{results.overall_feedback}</p>

      <div className="space-y-3">
        {results.test_results.map((test, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl bg-secondary p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-medium text-foreground">{test.title}</span>
              </div>
              <span className={`text-xs font-bold ${test.score >= 7 ? "text-green-500" : test.score >= 4 ? "text-yellow-500" : "text-red-500"}`}>
                {test.score}/10
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p><span className="font-medium">Input:</span> {test.input}</p>
              <details className="mt-1">
                <summary className="cursor-pointer font-medium text-foreground/80">Output real del modelo</summary>
                <p className="mt-1 whitespace-pre-wrap bg-background/50 rounded-lg p-2 max-h-48 overflow-y-auto">
                  {test.full_output || test.real_output}
                </p>
              </details>
              {test.feedback && (
                <p className={`mt-1 ${test.passed ? "text-muted-foreground" : "text-yellow-600 dark:text-yellow-400"}`}>
                  <span className="font-medium">Evaluación:</span> {test.feedback}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {results.critical_gaps.length > 0 && (
        <div className="rounded-xl bg-red-500/10 p-3">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Gaps críticos:</p>
          <ul className="space-y-1">
            {results.critical_gaps.map((gap, i) => (
              <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                <span>•</span> {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={onRunTests} disabled={isTesting} variant="outline" size="sm" className="rounded-full gap-2">
        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
        Re-testear
      </Button>
    </motion.div>
  );
}
