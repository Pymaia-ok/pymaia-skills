import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SkillPlayground from "@/components/crear-skill/SkillPlayground";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { submitSkill, submitPlugin } from "@/lib/api";
import { toast } from "sonner";
import SkillChat from "@/components/crear-skill/SkillChat";
import SkillPreview from "@/components/crear-skill/SkillPreview";
import SkillPublishConfig from "@/components/crear-skill/SkillPublishConfig";
import PluginTemplateSelector, { type PluginTemplate } from "@/components/crear-skill/PluginTemplateSelector";
import McpApiWizard from "@/components/crear-skill/McpApiWizard";
import type { Msg } from "@/lib/streaming";

interface StepProps {
  step: "chat" | "preview" | "playground" | "publish";
  setStep: (step: "chat" | "preview" | "playground" | "publish") => void;
}

type Step = "template" | "mcp-wizard" | "chat" | "preview" | "playground" | "publish";

interface RequiredMcp {
  name: string;
  description: string;
  url?: string;
  install_command?: string;
  required_tools: string[];
  credentials_needed?: string[];
  optional: boolean;
}

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
  required_mcps?: RequiredMcp[];
}

interface Quality {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface TestResults {
  test_results: {
    case_number: number;
    case_type: string;
    title: string;
    input: string;
    real_output: string;
    full_output?: string;
    passed: boolean;
    score: number;
    feedback: string;
  }[];
  overall_score: number;
  overall_feedback: string;
  critical_gaps: string[];
}

// Template context injected as system message
const templateContextMap: Record<PluginTemplate, string> = {
  "skill": "El usuario quiere crear un plugin simple basado en un SKILL.md. Solo genera un workflow de texto sin conexiones externas.",
  "api-connector": "El usuario quiere crear un plugin que se conecta a una API externa vía MCP server. Preguntale qué API quiere conectar y qué quiere hacer con ella.",
  "workflow": "El usuario quiere crear un workflow completo con múltiples skills, commands y posiblemente MCPs. Preguntale qué proceso quiere automatizar end-to-end.",
  "slash-command": "El usuario quiere crear un slash command rápido para Claude. Preguntale qué acción debería ejecutar el comando y con qué nombre (ej: /deploy, /review).",
  "subagent": "El usuario quiere crear un subagente especializado que Claude pueda invocar. Preguntale en qué dominio se especializa el agente y qué tareas debería resolver autónomamente.",
};

const CrearSkill = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<PluginTemplate | null>(null);
  const [mcpContext, setMcpContext] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [skill, setSkill] = useState<GeneratedSkill | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(() => !!searchParams.get("draft"));

  // Load draft from URL param — skip template selector if resuming
  useEffect(() => {
    const draftParam = searchParams.get("draft");
    if (!draftParam || !user) return;
    setDraftLoading(true);
    supabase
      .from("skill_drafts")
      .select("*")
      .eq("id", draftParam)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) {
          setDraftLoading(false);
          return;
        }
        setDraftId(data.id);
        const conv = (data.conversation as any[]) || [];
        setMessages(conv as Msg[]);
        if (data.generated_skill) {
          setSkill(data.generated_skill as any);
          if (data.quality_score != null || data.quality_feedback) {
            setQuality({
              score: data.quality_score ?? 0,
              feedback: data.quality_feedback ?? "",
              strengths: [],
              improvements: [],
            });
          }
          if (data.test_results) {
            setTestResults(data.test_results as any);
          }
          setStep(data.status === "tested" ? "preview" : data.status === "generated" ? "preview" : "chat");
        } else {
          setStep("chat");
        }
        setDraftLoading(false);
      });
  }, [user, searchParams]);

  // Auto-save conversation periodically and on meaningful changes
  const lastSavedRef = useRef<string>("");

  const saveConversationDraft = useCallback(async () => {
    if (!user || messages.length < 2) return;
    const statusMap: Record<string, string> = {
      chat: "interviewing",
      preview: skill ? "generated" : "interviewing",
      playground: "generated",
      publish: testResults ? "tested" : "generated",
    };
    const fingerprint = JSON.stringify({ messages, skill, quality, testResults, step });
    if (fingerprint === lastSavedRef.current) return;
    lastSavedRef.current = fingerprint;

    try {
      const payload = {
        user_id: user.id,
        conversation: messages as any,
        status: statusMap[step] || "interviewing",
        generated_skill: skill as any ?? null,
        quality_score: quality?.score ?? null,
        quality_feedback: quality?.feedback ?? null,
        test_results: testResults as any ?? null,
      };

      if (draftId) {
        await supabase.from("skill_drafts").update(payload).eq("id", draftId);
      } else {
        const { data } = await supabase.from("skill_drafts").insert(payload).select("id").single();
        if (data) setDraftId(data.id);
      }
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  }, [user, messages, skill, quality, testResults, draftId, step]);

  useEffect(() => {
    if (messages.length < 2) return;
    const interval = setInterval(saveConversationDraft, 30000);
    return () => clearInterval(interval);
  }, [messages.length, saveConversationDraft]);

  useEffect(() => {
    if (messages.length < 2) return;
    const timeout = setTimeout(saveConversationDraft, 3000);
    return () => clearTimeout(timeout);
  }, [step, skill, quality, testResults, saveConversationDraft]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length >= 2 && user) {
        const fingerprint = JSON.stringify(messages);
        if (fingerprint !== lastSavedRef.current) {
          const payload = {
            user_id: user.id,
            conversation: messages,
            status: "interviewing",
            generated_skill: skill ?? null,
            quality_score: quality?.score ?? null,
            quality_feedback: quality?.feedback ?? null,
            test_results: testResults ?? null,
          };
          if (draftId) {
            navigator.sendBeacon(
              `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/skill_drafts?id=eq.${draftId}`,
              new Blob([JSON.stringify(payload)], { type: "application/json" })
            );
          }
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages, user, draftId, skill, quality, testResults]);

  if (loading || draftLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // Handle template selection
  const handleTemplateSelect = (template: PluginTemplate) => {
    setSelectedTemplate(template);
    if (template === "api-connector") {
      setStep("mcp-wizard");
    } else {
      // Inject template context as initial system-like message
      const context = templateContextMap[template];
      setMessages([{ role: "assistant", content: `🎯 **Template: ${template === "skill" ? "Skill simple" : template === "workflow" ? "Workflow completo" : template === "slash-command" ? "Slash command" : "Subagente"}**\n\n${context}\n\n¿Qué querés crear?` }]);
      setStep("chat");
    }
  };

  // Handle MCP wizard completion
  const handleMcpWizardComplete = (result: any) => {
    setMcpContext(result);
    const contextMsg = `🔌 **API Connector configurado**\n\nAPI: \`${result.api_url}\`\nAuth: ${result.auth_type}\nEndpoints: ${result.endpoints.length} seleccionados\n\nYa generé el servidor MCP. Ahora describime qué querés que haga el plugin con esta API. ¿Qué workflow o automatización necesitás?`;
    setMessages([{ role: "assistant", content: contextMsg }]);
    setStep("chat");
  };

  const saveDraft = async (
    skillData: GeneratedSkill,
    qualityData: Quality | null,
    testData: TestResults | null,
    conversation: Msg[],
    status: string = "generated"
  ) => {
    try {
      const payload = {
        user_id: user.id,
        conversation: conversation as any,
        generated_skill: skillData as any,
        quality_score: qualityData?.score ?? null,
        quality_feedback: qualityData?.feedback ?? null,
        test_results: testData as any,
        status,
      };

      if (draftId) {
        await supabase.from("skill_drafts").update(payload).eq("id", draftId);
      } else {
        const { data } = await supabase.from("skill_drafts").insert(payload).select("id").single();
        if (data) setDraftId(data.id);
      }
      lastSavedRef.current = JSON.stringify(conversation);
    } catch (e) {
      console.error("Failed to save draft", e);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const body: any = { conversation: messages, action: "generate" };
      // Inject MCP context if available from wizard
      if (mcpContext) {
        body.mcp_context = {
          api_url: mcpContext.api_url,
          auth_type: mcpContext.auth_type,
          skill_context: mcpContext.skill_context,
          endpoints: mcpContext.endpoints,
        };
      }
      // Inject template type
      if (selectedTemplate) {
        body.template_type = selectedTemplate;
      }

      const { data, error } = await supabase.functions.invoke("generate-skill", { body });
      if (error) throw error;
      setSkill(data.skill);
      setQuality(data.quality);
      setTestResults(null);
      setStep("preview");
      await saveDraft(data.skill, data.quality, null, messages, "generated");
      toast.success("Borrador guardado automáticamente");
    } catch (e) {
      console.error(e);
      toast.error(t("crearSkill.errorGenerate"));
    }
    setIsGenerating(false);
  };

  const handleRefine = async (request: string) => {
    if (!skill) return;
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-skill", {
        body: { action: "refine", skill, refinement_request: request },
      });
      if (error) throw error;
      setSkill(data.skill);
      setQuality(data.quality);
      setTestResults(null);
      toast.success(t("crearSkill.skillUpdated"));
      await saveDraft(data.skill, data.quality, null, messages, "generated");
    } catch {
      toast.error(t("crearSkill.errorRefine"));
    }
    setIsRefining(false);
  };

  const handleRunTests = async () => {
    if (!skill) return;
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-skill", {
        body: { skill },
      });
      if (error) throw error;
      setTestResults(data);
      toast.success(t("crearSkill.testsDone", { passed: data.test_results.filter((t: any) => t.passed).length, total: data.test_results.length }));
      await saveDraft(skill, quality, data, messages, "tested");
    } catch {
      toast.error(t("crearSkill.errorTests"));
    }
    setIsTesting(false);
  };


  const handlePublish = async (config: { 
    category: string; 
    industry: string[]; 
    target_roles: string[];
    pricing_model: string;
    price_amount: number | null;
    required_mcps?: RequiredMcp[];
    is_public: boolean;
    publish_as_plugin: boolean;
  }) => {
    if (!skill || !user) return;
    setIsPublishing(true);
    setScanResult(null);

    // ── Security Gate: scan before publishing ──
    try {
      const contentToScan = [skill.name, skill.tagline, skill.description, skill.instructions, skill.install_command].join("\n\n");
      const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      const { data: scanData, error: scanError } = await supabase.functions.invoke("scan-security", {
        body: {
          gate_mode: true,
          content: contentToScan,
          install_command: skill.install_command,
          slug,
          item_type: "skill",
        },
      });

      if (!scanError && scanData && !scanData.pass) {
        setScanResult(scanData);
        setIsPublishing(false);
        toast.error("Se detectaron problemas de seguridad — revisá los detalles");
        return;
      }
      if (scanData) setScanResult(scanData);
    } catch (err) {
      console.error("Security gate error:", err);
      // Allow publish if scan infra fails
    }

    // ── Publish ──
    try {
      const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const useCases = skill.examples.map((ex) => ({
        title: ex.title,
        before: ex.input,
        after: ex.output,
      }));

      await submitSkill({
        slug,
        display_name: skill.name,
        tagline: skill.tagline,
        description_human: skill.description,
        use_cases: useCases,
        target_roles: config.target_roles,
        install_command: skill.install_command,
        time_to_install_minutes: 2,
        industry: config.industry,
        creator_id: user.id,
        required_mcps: config.required_mcps || skill.required_mcps || [],
        is_public: config.is_public,
      });

      if (config.publish_as_plugin) {
        try {
          const { data: wrapper, error: wrapError } = await supabase.functions.invoke("generate-skill", {
            body: { action: "wrap_plugin", skill },
          });
          if (wrapError) throw wrapError;

          await submitPlugin({
            slug: slug,
            name: wrapper.plugin_name || skill.name,
            description: wrapper.plugin_description || skill.tagline,
            category: config.category,
            creator_id: user.id,
            source: "community",
          });
          toast.success("Plugin publicado en el marketplace");
        } catch (e) {
          console.error("Plugin publish error:", e);
          toast.error("La skill se publicó pero hubo un error al crear el plugin");
        }
      }

      if (draftId) {
        await supabase.from("skill_drafts").update({ status: "published" }).eq("id", draftId);
      }

      toast.success(t("crearSkill.published"));
      navigate("/mis-skills");
    } catch {
      toast.error(t("crearSkill.errorPublish"));
    }
    setIsPublishing(false);
  };

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden">
      <div className="pt-14 flex-1 flex flex-col min-h-0">
        {step === "template" && (
          <div className="flex-1 overflow-y-auto">
            <PluginTemplateSelector
              onSelect={handleTemplateSelect}
              onSkip={() => {
                setSelectedTemplate("skill");
                setStep("chat");
              }}
            />
          </div>
        )}

        {step === "mcp-wizard" && (
          <div className="flex-1 overflow-y-auto">
            <McpApiWizard
              onComplete={handleMcpWizardComplete}
              onBack={() => setStep("template")}
            />
          </div>
        )}

        {step === "chat" && (
          <div className="flex-1 flex flex-col min-h-0">
            <SkillChat
              messages={messages}
              setMessages={setMessages}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              userId={user.id}
            />
          </div>
        )}

        {step === "preview" && skill && quality && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full px-4 pt-6 pb-12">
              <SkillPreview
                skill={skill}
                quality={quality}
                testResults={testResults}
                onRefine={handleRefine}
                onPublish={() => setStep("publish")}
                onBack={() => setStep("chat")}
                onRunTests={handleRunTests}
                onPlayground={() => setStep("playground")}
                isRefining={isRefining}
                isTesting={isTesting}
              />
            </div>
          </div>
        )}

        {step === "playground" && skill && (
          <div className="flex-1 flex flex-col min-h-0">
            <SkillPlayground
              skill={skill}
              onBack={() => setStep("preview")}
              onRefine={() => setStep("preview")}
            />
          </div>
        )}

        {step === "publish" && skill && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full px-4 pt-6 pb-12">
              <SkillPublishConfig
                initialCategory={skill.category}
                initialIndustry={skill.industry}
                initialRoles={skill.target_roles}
                initialMcps={skill.required_mcps || []}
                onPublish={handlePublish}
                onBack={() => setStep("preview")}
                isPublishing={isPublishing}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrearSkill;
