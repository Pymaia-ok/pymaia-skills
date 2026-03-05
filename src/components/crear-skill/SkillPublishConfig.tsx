import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SKILL_CATEGORIES } from "@/lib/api";

const industryOptions = ["Agencias", "Legal", "Consultoras", "E-commerce", "Startups", "Educación", "Finanzas", "Salud", "Tecnología"];
const roleOptions = ["marketer", "abogado", "consultor", "founder", "disenador", "desarrollador", "médico", "product manager", "otro"];
const pricingModels = [
  { key: "free", label: "Gratis", description: "Acceso libre para todos" },
  { key: "subscription", label: "Suscripción", description: "Cobro mensual recurrente" },
  { key: "pay_per_use", label: "Por uso", description: "Se cobra por cada ejecución" },
];

interface SkillPublishConfigProps {
  initialCategory: string;
  initialIndustry: string[];
  initialRoles: string[];
  onPublish: (config: { 
    category: string; 
    industry: string[]; 
    target_roles: string[];
    pricing_model: string;
    price_amount: number | null;
  }) => Promise<void>;
  onBack: () => void;
  isPublishing: boolean;
}

export default function SkillPublishConfig({ initialCategory, initialIndustry, initialRoles, onPublish, onBack, isPublishing }: SkillPublishConfigProps) {
  const [category, setCategory] = useState(initialCategory);
  const [industry, setIndustry] = useState<string[]>(initialIndustry);
  const [roles, setRoles] = useState<string[]>(initialRoles);
  const [pricingModel, setPricingModel] = useState("free");
  const [priceAmount, setPriceAmount] = useState<string>("");

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
          <p className="text-sm text-muted-foreground">Revisá los metadatos y pricing antes de publicar</p>
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

      {/* Pricing */}
      <div>
        <label className="text-sm font-medium mb-3 block">Modelo de precio</label>
        <div className="grid grid-cols-3 gap-3">
          {pricingModels.map((pm) => (
            <button
              key={pm.key}
              type="button"
              onClick={() => setPricingModel(pm.key)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                pricingModel === pm.key
                  ? "border-foreground bg-foreground/5"
                  : "border-border bg-card hover:bg-secondary/50"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{pm.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{pm.description}</p>
            </button>
          ))}
        </div>

        {pricingModel !== "free" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
            <label className="text-sm font-medium mb-2 block">
              Precio (USD) {pricingModel === "subscription" ? "/ mes" : "/ uso"}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                placeholder="29"
                className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Skills similares cobran entre $9 y $49/mes
            </p>
          </motion.div>
        )}
      </div>

      {/* Installation instructions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">📦 Cómo instalar después de publicar</h3>
        <div className="space-y-3">
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-xs font-medium text-foreground mb-1">Claude Code</p>
            <p className="text-xs text-muted-foreground">Copiá el SKILL.md y pegalo en la carpeta <code className="bg-background px-1 py-0.5 rounded text-[10px]">.claude/skills/</code> de tu proyecto.</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-xs font-medium text-foreground mb-1">Claude.ai</p>
            <p className="text-xs text-muted-foreground">Subí el archivo SKILL.md directamente en una conversación o agregalo a un proyecto como conocimiento.</p>
          </div>
        </div>
      </div>

      <Button
        onClick={() => onPublish({ 
          category, 
          industry, 
          target_roles: roles,
          pricing_model: pricingModel,
          price_amount: pricingModel !== "free" && priceAmount ? parseFloat(priceAmount) : null,
        })}
        disabled={isPublishing || !category || roles.length === 0 || (pricingModel !== "free" && !priceAmount)}
        className="w-full rounded-full gap-2"
        size="lg"
      >
        {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        {isPublishing ? "Publicando..." : "Publicar en el marketplace"}
      </Button>
    </motion.div>
  );
}
