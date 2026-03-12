import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileCode, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  required_mcps?: any[];
}

interface Quality {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface SkillImporterProps {
  onImported: (skill: GeneratedSkill, quality: Quality) => void;
  onCancel: () => void;
}

export default function SkillImporter({ onImported, onCancel }: SkillImporterProps) {
  const [markdown, setMarkdown] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && file.type !== "text/markdown" && file.type !== "text/plain") {
      toast.error("Solo se aceptan archivos .md o .txt");
      return;
    }
    const text = await file.text();
    setMarkdown(text);
    setError(null);
  };

  const handleImport = async () => {
    if (markdown.trim().length < 50) {
      setError("El contenido es muy corto. Pegá el archivo SKILL.md completo.");
      return;
    }
    setIsImporting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-skill", {
        body: { action: "import_skill", skill_md: markdown },
      });
      if (fnError) throw fnError;
      if (!data?.skill) throw new Error("No skill returned");
      onImported(data.skill, data.quality);
      toast.success("Skill importada correctamente");
    } catch (e: any) {
      console.error(e);
      setError("Error al importar. Verificá que sea un SKILL.md válido.");
    }
    setIsImporting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto w-full px-4 py-12 space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary mb-2">
          <Upload className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Importar skill existente</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Pegá el contenido de un SKILL.md creado en Claude Code u otro agente, o subí el archivo directamente.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFile} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
            <FileCode className="w-3 h-3" /> Subir archivo .md
          </Button>
        </div>

        <Textarea
          value={markdown}
          onChange={(e) => { setMarkdown(e.target.value); setError(null); }}
          placeholder="Pegá el contenido de tu SKILL.md acá..."
          className="min-h-[300px] font-mono text-xs"
        />

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="text-sm">
          Cancelar
        </Button>
        <Button
          onClick={handleImport}
          disabled={isImporting || markdown.trim().length < 50}
          className="gap-1.5 flex-1"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Analizando skill...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4" /> Importar y analizar
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
