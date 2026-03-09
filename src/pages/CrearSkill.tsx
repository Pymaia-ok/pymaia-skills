import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SkillPlayground from "@/components/crear-skill/SkillPlayground";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { submitSkill } from "@/lib/api";
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
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [skill, setSkill] = useState<GeneratedSkill | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // Save or update draft in skill_drafts table
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
    } catch (e) {
      console.error("Failed to save draft", e);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-skill", {
        body: { conversation: messages, action: "generate" },
      });
      if (error) throw error;
      setSkill(data.skill);
      setQuality(data.quality);
      setTestResults(null);
      setStep("preview");
      // Auto-save as draft
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
      // Update draft
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
      // Update draft with test results
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
  }) => {
    if (!skill || !user) return;
    setIsPublishing(true);
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
