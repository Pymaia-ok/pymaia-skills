import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Plug, Shield, Globe, Key, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  selected: boolean;
}

interface McpWizardResult {
  api_url: string;
  auth_type: string;
  api_key_header?: string;
  endpoints: { method: string; path: string; summary: string }[];
  mcp_server_code: string;
  mcp_config: any;
  skill_context: string;
}

interface McpApiWizardProps {
  onComplete: (result: McpWizardResult) => void;
  onBack: () => void;
}

type WizardStep = "url" | "auth" | "endpoints" | "generating";

export default function McpApiWizard({ onComplete, onBack }: McpApiWizardProps) {
  const [wizardStep, setWizardStep] = useState<WizardStep>("url");
  const [apiUrl, setApiUrl] = useState("");
  const [apiDescription, setApiDescription] = useState("");
  const [authType, setAuthType] = useState<"none" | "api-key" | "oauth" | "bearer">("api-key");
  const [apiKeyHeader, setApiKeyHeader] = useState("Authorization");
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const authOptions = [
    { key: "none", label: "Sin autenticación", icon: <Globe className="w-4 h-4" />, desc: "API pública sin auth" },
    { key: "api-key", label: "API Key", icon: <Key className="w-4 h-4" />, desc: "Header con clave de API" },
    { key: "bearer", label: "Bearer Token", icon: <Shield className="w-4 h-4" />, desc: "Token JWT o similar" },
    { key: "oauth", label: "OAuth 2.0", icon: <Shield className="w-4 h-4" />, desc: "Flujo OAuth con redirect" },
  ];

  const handleDetectEndpoints = async () => {
    setIsDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-skill", {
        body: {
          action: "detect_api",
          api_url: apiUrl,
          api_description: apiDescription,
        },
      });
      if (error) throw error;
      const detected = (data.endpoints || []).map((ep: any) => ({
        method: ep.method || "GET",
        path: ep.path || "/",
        summary: ep.summary || "",
        selected: true,
      }));
      setEndpoints(detected);
      setWizardStep("endpoints");
    } catch (e) {
      console.error(e);
      // Fallback: let user add manually
      setEndpoints([
        { method: "GET", path: "/", summary: "Endpoint principal", selected: true },
      ]);
      setWizardStep("endpoints");
      toast.info("No pudimos detectar endpoints automáticamente. Agregá los que necesites.");
    }
    setIsDetecting(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setWizardStep("generating");
    try {
      const selectedEndpoints = endpoints.filter((e) => e.selected);
      const { data, error } = await supabase.functions.invoke("generate-skill", {
        body: {
          action: "generate_mcp",
          api_url: apiUrl,
          api_description: apiDescription,
          auth_type: authType,
          api_key_header: apiKeyHeader,
          endpoints: selectedEndpoints.map(({ method, path, summary }) => ({ method, path, summary })),
        },
      });
      if (error) throw error;

      onComplete({
        api_url: apiUrl,
        auth_type: authType,
        api_key_header: authType === "api-key" ? apiKeyHeader : undefined,
        endpoints: selectedEndpoints,
        mcp_server_code: data.mcp_server_code,
        mcp_config: data.mcp_config,
        skill_context: data.skill_context,
      });
    } catch (e) {
      console.error(e);
      toast.error("Error generando el MCP server. Intentá de nuevo.");
      setWizardStep("endpoints");
    }
    setIsGenerating(false);
  };

  const toggleEndpoint = (idx: number) => {
    setEndpoints((prev) => prev.map((e, i) => (i === idx ? { ...e, selected: !e.selected } : e)));
  };

  const addEndpoint = () => {
    setEndpoints((prev) => [...prev, { method: "GET", path: "/new", summary: "", selected: true }]);
  };

  const updateEndpoint = (idx: number, field: keyof ApiEndpoint, value: string) => {
    setEndpoints((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              <Plug className="w-5 h-5 inline mr-2" />
              Crear API Connector
            </h2>
            <p className="text-sm text-muted-foreground">Generá un plugin que conecte a cualquier API externa</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {["URL de la API", "Autenticación", "Endpoints", "Generando"].map((label, i) => {
            const steps: WizardStep[] = ["url", "auth", "endpoints", "generating"];
            const stepIdx = steps.indexOf(wizardStep);
            const isActive = i === stepIdx;
            const isDone = i < stepIdx;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isActive ? "bg-foreground text-background" : isDone ? "bg-foreground/20 text-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                {i < 3 && <div className="w-6 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: API URL */}
          {wizardStep === "url" && (
            <motion.div key="url" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">URL base de la API</label>
                <input
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.ejemplo.com/v1"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Si tiene un OpenAPI/Swagger spec (ej: /openapi.json), lo detectaremos automáticamente.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">¿Qué hace esta API?</label>
                <textarea
                  value={apiDescription}
                  onChange={(e) => setApiDescription(e.target.value)}
                  placeholder="Ej: API de mi CRM que permite consultar clientes, crear deals y enviar propuestas"
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <Button
                onClick={() => setWizardStep("auth")}
                disabled={!apiUrl.trim()}
                className="w-full rounded-full gap-2"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Auth */}
          {wizardStep === "auth" && (
            <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <label className="text-sm font-medium block">¿Cómo se autentica?</label>
              <div className="grid grid-cols-2 gap-3">
                {authOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setAuthType(opt.key as any)}
                    className={`rounded-2xl border p-4 text-left transition-colors flex items-start gap-3 ${
                      authType === opt.key ? "border-foreground bg-foreground/5" : "border-border bg-card hover:bg-secondary/50"
                    }`}
                  >
                    <div className="mt-0.5 text-muted-foreground">{opt.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {authType === "api-key" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Header de la API key</label>
                  <input
                    value={apiKeyHeader}
                    onChange={(e) => setApiKeyHeader(e.target.value)}
                    placeholder="Authorization"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setWizardStep("url")} className="rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                </Button>
                <Button
                  onClick={handleDetectEndpoints}
                  disabled={isDetecting}
                  className="flex-1 rounded-full gap-2"
                >
                  {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isDetecting ? "Detectando endpoints..." : "Detectar endpoints"}
                  {!isDetecting && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Endpoints */}
          {wizardStep === "endpoints" && (
            <motion.div key="endpoints" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <label className="text-sm font-medium block">Endpoints a incluir</label>
              <p className="text-xs text-muted-foreground">Seleccioná los endpoints que tu plugin va a exponer como herramientas de Claude.</p>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {endpoints.map((ep, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                      ep.selected ? "border-foreground/30 bg-foreground/5" : "border-border bg-card opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ep.selected}
                      onChange={() => toggleEndpoint(idx)}
                      className="accent-foreground"
                    />
                    <select
                      value={ep.method}
                      onChange={(e) => updateEndpoint(idx, "method", e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono text-foreground"
                    >
                      {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      value={ep.path}
                      onChange={(e) => updateEndpoint(idx, "path", e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono text-foreground"
                    />
                    <input
                      value={ep.summary}
                      onChange={(e) => updateEndpoint(idx, "summary", e.target.value)}
                      placeholder="Descripción"
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                    />
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={addEndpoint} className="text-xs">
                + Agregar endpoint
              </Button>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setWizardStep("auth")} className="rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={endpoints.filter((e) => e.selected).length === 0}
                  className="flex-1 rounded-full gap-2"
                >
                  Generar plugin con MCP <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Generating */}
          {wizardStep === "generating" && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-foreground mx-auto" />
              <div>
                <p className="font-semibold text-foreground">Generando tu plugin con MCP server...</p>
                <p className="text-sm text-muted-foreground mt-1">Esto puede tomar 15-30 segundos</p>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>✅ Analizando API endpoints</p>
                <p>✅ Creando servidor MCP en TypeScript</p>
                <p>⏳ Generando plugin.json y SKILL.md</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
