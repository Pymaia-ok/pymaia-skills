import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuizQuestion {
  question: string;
  question_es?: string;
  options: string[];
  options_es?: string[];
  correct_index: number;
}

interface ModuleQuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

const ModuleQuiz = ({ questions, onComplete }: ModuleQuizProps) => {
  const { i18n, t } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!questions.length) return null;

  const q = questions[current];
  const questionText = isEs && q.question_es ? q.question_es : q.question;
  const options = isEs && q.options_es?.length ? q.options_es : q.options;

  const handleCheck = () => {
    if (selected === null) return;
    setRevealed(true);
    if (selected === q.correct_index) setCorrect((c) => c + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      const finalScore = selected === q.correct_index ? correct + 0 : correct; // already counted
      setFinished(true);
      onComplete(Math.round((correct / questions.length) * 100));
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setRevealed(false);
  };

  if (finished) {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
        <h3 className="text-xl font-bold text-foreground">{t("courses.quizComplete")}</h3>
        <p className="text-muted-foreground mt-1">
          {correct}/{questions.length} {t("courses.correctAnswers")} — {pct}%
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          {t("courses.quiz")}
        </h3>
        <span className="text-xs text-muted-foreground">
          {current + 1}/{questions.length}
        </span>
      </div>

      <p className="text-base font-medium text-foreground mb-4">{questionText}</p>

      <div className="space-y-2">
        {options.map((opt, idx) => {
          let classes = "w-full text-left p-3 rounded-lg border text-sm transition-all ";
          if (revealed) {
            if (idx === q.correct_index) classes += "border-emerald-500 bg-emerald-500/10 text-foreground";
            else if (idx === selected) classes += "border-destructive bg-destructive/10 text-foreground";
            else classes += "border-border text-muted-foreground opacity-50";
          } else {
            classes += selected === idx
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border hover:border-primary/40 text-foreground";
          }
          return (
            <button
              key={idx}
              onClick={() => !revealed && setSelected(idx)}
              className={classes}
              disabled={revealed}
            >
              <span className="flex items-center gap-2">
                {revealed && idx === q.correct_index && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {revealed && idx === selected && idx !== q.correct_index && <XCircle className="w-4 h-4 text-destructive" />}
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        {!revealed ? (
          <Button onClick={handleCheck} disabled={selected === null} size="sm">
            {t("courses.checkAnswer")}
          </Button>
        ) : (
          <Button onClick={handleNext} size="sm">
            {current + 1 < questions.length ? t("courses.nextQuestion") : t("courses.seeResults")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModuleQuiz;
