import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SKILL_CATEGORIES } from "@/lib/api";

const industryOptions = ["Agencias", "Legal", "Consultoras", "E-commerce", "Startups", "Educación", "Finanzas"];
const roleOptions = ["marketer", "abogado", "consultor", "founder", "disenador", "desarrollador", "otro"];

interface SkillPublishConfigProps {
  initialCategory: string;
  initialIndustry: string[];
  initialRoles: string[];
  onPublish: (config: { category: string; industry: string[]; target_roles: string[] }) => Promise<void>;
  onBack: () => void;
  isPublishing: boolean;
}

export default function SkillPublishConfig({ initialCategory, initialIndustry, initialRoles, onPublish, onBack, isPublishing }: SkillPublishConfigProps) {
  const [category, setCategory] = useState(initialCategory);
  const [industry, setIndustry] = useState<string[]>(initialIndustry);
  const [roles, setRoles] = useState<string[]>(initialRoles);

  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Configurar publicación</h2>
          <p className="text-sm text-muted-foreground">Revisá los metadatos antes de publicar</p>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-medium mb-3 block">Categoría</label>
        <div className="flex flex-wrap gap-2">
          {SKILL_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === c.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div>
        <label className="text-sm font-medium mb-3 block">Industria</label>
        <div className="flex flex-wrap gap-2">
          {industryOptions.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndustry(toggle(industry, i))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                industry.includes(i) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Roles */}
      <div>
        <label className="text-sm font-medium mb-3 block">Roles objetivo</label>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoles(toggle(roles, r))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                roles.includes(r) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => onPublish({ category, industry, target_roles: roles })}
        disabled={isPublishing || !category || roles.length === 0}
        className="w-full rounded-full gap-2"
        size="lg"
      >
        {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        {isPublishing ? "Publicando..." : "Publicar en el marketplace"}
      </Button>
    </motion.div>
  );
}
