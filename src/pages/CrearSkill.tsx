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
import type { Msg } from "@/lib/streaming";

interface StepProps {
  step: "chat" | "preview" | "playground" | "publish";
  setStep: (step: "chat" | "preview" | "playground" | "publish") => void;
}

type Step = "chat" | "preview" | "playground" | "publish";

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

const CrearSkill = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("chat");
  const [mcpContext, setMcpContext] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [skill, setSkill] = useState<GeneratedSkill | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatingPhase, setGeneratingPhase] = useState<string>("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(() => !!searchParams.get("draft"));

  // Load draft from URL param
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
      if (mcpContext) {
        body.mcp_context = {
          api_url: mcpContext.api_url,
          auth_type: mcpContext.auth_type,
          skill_context: mcpContext.skill_context,
          endpoints: mcpContext.endpoints,
        };
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

      if (!scanError && scanData) {
        setScanResult(scanData);
        
        if (scanData.verdict === "MALICIOUS") {
          setIsPublishing(false);
          toast.error(t("crearSkill.securityBlocked", "Tu skill no pasó la validación de seguridad — revisá los detalles"));
          return;
        }
        
        if (scanData.verdict === "SUSPICIOUS") {
          toast.warning(t("crearSkill.securityWarning", "Se encontraron algunos items para revisar. Tu skill será publicado con review pendiente."));
        }
        
        if (scanData.verdict === "SAFE") {
          toast.success(t("crearSkill.securityPassed", "Tu skill pasó la validación de seguridad ✓"));
        }
      }
    } catch (err) {
      console.error("Security gate error:", err);
    }

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
              {scanResult && (
                <div className={`mb-6 p-4 rounded-xl border ${
                  scanResult.verdict === "MALICIOUS" 
                    ? "bg-destructive/10 border-destructive/30" 
                    : scanResult.verdict === "SUSPICIOUS"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-emerald-500/10 border-emerald-500/30"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold ${
                      scanResult.verdict === "MALICIOUS" ? "text-destructive" 
                      : scanResult.verdict === "SUSPICIOUS" ? "text-amber-600 dark:text-amber-400" 
                      : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {scanResult.verdict === "SAFE" && "✅ Validación de seguridad aprobada"}
                      {scanResult.verdict === "SUSPICIOUS" && "⚠️ Se encontraron items para revisar"}
                      {scanResult.verdict === "MALICIOUS" && "🚫 No pasó la validación de seguridad"}
                    </span>
                  </div>
                  {scanResult.verdict !== "SAFE" && (
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {scanResult.layers?.secrets?.count > 0 && (
                        <li>• Se detectaron {scanResult.layers.secrets.count} credenciales expuestas</li>
                      )}
                      {scanResult.layers?.injection?.critical > 0 && (
                        <li>• {scanResult.layers.injection.critical} patrones de prompt injection críticos</li>
                      )}
                      {scanResult.layers?.typosquatting?.flags?.length > 0 && (
                        <li>• Nombre similar a herramientas populares (typosquatting)</li>
                      )}
                      {scanResult.layers?.hidden_content?.findings?.length > 0 && (
                        <li>• Contenido oculto u ofuscado detectado</li>
                      )}
                      {scanResult.layers?.format?.issues?.filter((i: any) => i.severity === "error").map((i: any, idx: number) => (
                        <li key={idx}>• {i.issue}</li>
                      ))}
                      {scanResult.layers?.hooks?.blocked_count > 0 && (
                        <li>• {scanResult.layers.hooks.blocked_count} hooks peligrosos bloqueados</li>
                      )}
                      {scanResult.layers?.scope?.scope_assessment === "excessive" && (
                        <li>• Permisos excesivos detectados</li>
                      )}
                      {scanResult.layers?.llm?.verdict === "MALICIOUS" && (
                        <li>• Análisis de IA detectó contenido malicioso</li>
                      )}
                    </ul>
                  )}
                  {scanResult.verdict === "MALICIOUS" && (
                    <p className="text-xs mt-2 text-destructive font-medium">
                      Corregí los problemas de arriba y volvé a intentar publicar.
                    </p>
                  )}
                </div>
              )}

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
