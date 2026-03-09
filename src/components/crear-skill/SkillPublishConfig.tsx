import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Rocket, Plus, Trash2, ExternalLink, Globe, Lock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SKILL_CATEGORIES } from "@/lib/api";

const industryOptions = ["Agencias", "Legal", "Consultoras", "E-commerce", "Startups", "Educación", "Finanzas", "Salud", "Tecnología"];
const roleOptions = ["marketer", "abogado", "consultor", "founder", "disenador", "desarrollador", "médico", "product manager", "otro"];
const pricingModels = [
  { key: "free", label: "Gratis", description: "Acceso libre para todos" },
  { key: "subscription", label: "Suscripción", description: "Cobro mensual recurrente" },
  { key: "pay_per_use", label: "Por uso", description: "Se cobra por cada ejecución" },
];

interface RequiredMcp {
  name: string;
  description: string;
  url?: string;
  install_command?: string;
  required_tools: string[];
  credentials_needed?: string[];
  optional: boolean;
}

interface SkillPublishConfigProps {
  initialCategory: string;
  initialIndustry: string[];
  initialRoles: string[];
  initialMcps?: RequiredMcp[];
  onPublish: (config: { 
    category: string; 
    industry: string[]; 
    target_roles: string[];
    pricing_model: string;
    price_amount: number | null;
    required_mcps?: RequiredMcp[];
    is_public: boolean;
    publish_as_plugin: boolean;
  }) => Promise<void>;
  onBack: () => void;
  isPublishing: boolean;
}

const emptyMcp: RequiredMcp = { name: "", description: "", url: "", install_command: "", required_tools: [], credentials_needed: [], optional: false };

export default function SkillPublishConfig({ initialCategory, initialIndustry, initialRoles, initialMcps = [], onPublish, onBack, isPublishing }: SkillPublishConfigProps) {
  const [category, setCategory] = useState(initialCategory);
  const [industry, setIndustry] = useState<string[]>(initialIndustry);
  const [roles, setRoles] = useState<string[]>(initialRoles);
  const [pricingModel, setPricingModel] = useState("free");
  const [priceAmount, setPriceAmount] = useState<string>("");
  const [mcps, setMcps] = useState<RequiredMcp[]>(initialMcps);
  const [newToolInput, setNewToolInput] = useState<Record<number, string>>({});
  const [isPublic, setIsPublic] = useState(true);

  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const updateMcp = (index: number, field: keyof RequiredMcp, value: any) => {
    setMcps(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const addTool = (index: number) => {
    const tool = (newToolInput[index] || "").trim();
    if (!tool) return;
    setMcps(prev => prev.map((m, i) => i === index ? { ...m, required_tools: [...m.required_tools, tool] } : m));
    setNewToolInput(prev => ({ ...prev, [index]: "" }));
  };

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
            <button key={c.key} type="button" onClick={() => setCategory(c.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === c.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div>
        <label className="text-sm font-medium mb-3 block">Industria</label>
        <div className="flex flex-wrap gap-2">
          {industryOptions.map((i) => (
            <button key={i} type="button" onClick={() => setIndustry(toggle(industry, i))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${industry.includes(i) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}
            >{i}</button>
          ))}
        </div>
      </div>

      {/* Roles */}
      <div>
        <label className="text-sm font-medium mb-3 block">Roles objetivo</label>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((r) => (
            <button key={r} type="button" onClick={() => setRoles(toggle(roles, r))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${roles.includes(r) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* MCP Dependencies */}
      <div>
        <label className="text-sm font-medium mb-1 block">🔌 Dependencias externas (MCP Servers)</label>
        <p className="text-xs text-muted-foreground mb-3">
          Si tu skill necesita interactuar con sistemas externos (email, WhatsApp, APIs), agregá los MCPs requeridos.
        </p>

        {mcps.length > 0 && (
          <div className="space-y-4 mb-4">
            {mcps.map((mcp, idx) => (
              <div key={idx} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">MCP #{idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{mcp.optional ? "Opcional" : "Requerido"}</span>
                      <Switch checked={!mcp.optional} onCheckedChange={(checked) => updateMcp(idx, "optional", !checked)} />
                    </div>
                    <button type="button" onClick={() => setMcps(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={mcp.name} onChange={(e) => updateMcp(idx, "name", e.target.value)} placeholder="Nombre (ej: Gmail MCP)"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                  <input value={mcp.description} onChange={(e) => updateMcp(idx, "description", e.target.value)} placeholder="Descripción corta"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                  <input value={mcp.url || ""} onChange={(e) => updateMcp(idx, "url", e.target.value)} placeholder="URL del repo (opcional)"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                  <input value={mcp.install_command || ""} onChange={(e) => updateMcp(idx, "install_command", e.target.value)} placeholder="Comando de instalación (opcional)"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground mb-1 block">Tools requeridas</span>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {mcp.required_tools.map((tool, ti) => (
                      <span key={ti} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs text-foreground">
                        <code>{tool}</code>
                        <button type="button" onClick={() => updateMcp(idx, "required_tools", mcp.required_tools.filter((_, j) => j !== ti))} className="text-muted-foreground hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newToolInput[idx] || ""} onChange={(e) => setNewToolInput(prev => ({ ...prev, [idx]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTool(idx))}
                      placeholder="send_email" className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" />
                    <Button type="button" variant="outline" size="sm" onClick={() => addTool(idx)} className="text-xs h-7">Agregar</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" onClick={() => setMcps(prev => [...prev, { ...emptyMcp }])} className="gap-2 text-sm">
          <Plus className="w-3.5 h-3.5" /> Agregar MCP
        </Button>
      </div>

      {/* Visibility */}
      <div>
        <label className="text-sm font-medium mb-3 block">Visibilidad</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={`rounded-2xl border p-4 text-left transition-colors flex items-center gap-3 ${isPublic ? "border-foreground bg-foreground/5" : "border-border bg-card hover:bg-secondary/50"}`}
          >
            <Globe className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Pública</p>
              <p className="text-xs text-muted-foreground mt-0.5">Visible en el marketplace</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={`rounded-2xl border p-4 text-left transition-colors flex items-center gap-3 ${!isPublic ? "border-foreground bg-foreground/5" : "border-border bg-card hover:bg-secondary/50"}`}
          >
            <Lock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Privada</p>
              <p className="text-xs text-muted-foreground mt-0.5">Solo accesible con link</p>
            </div>
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <label className="text-sm font-medium mb-3 block">Modelo de precio</label>
        <div className="grid grid-cols-3 gap-3">
          {pricingModels.map((pm) => (
            <button key={pm.key} type="button" onClick={() => setPricingModel(pm.key)}
              className={`rounded-2xl border p-4 text-left transition-colors ${pricingModel === pm.key ? "border-foreground bg-foreground/5" : "border-border bg-card hover:bg-secondary/50"}`}
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
              <input type="number" min="1" step="1" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} placeholder="29"
                className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">💡 Skills similares cobran entre $9 y $49/mes</p>
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
          category, industry, target_roles: roles,
          pricing_model: pricingModel,
          price_amount: pricingModel !== "free" && priceAmount ? parseFloat(priceAmount) : null,
          required_mcps: mcps.filter(m => m.name.trim()),
          is_public: isPublic,
        })}
        disabled={isPublishing || !category || roles.length === 0 || (pricingModel !== "free" && !priceAmount)}
        className="w-full rounded-full gap-2" size="lg"
      >
        {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        {isPublishing ? "Publicando..." : "Publicar en el marketplace"}
      </Button>
    </motion.div>
  );
}
