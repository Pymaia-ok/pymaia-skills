import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { submitSkill } from "@/lib/api";
import { toast } from "sonner";
import SkillChat from "@/components/crear-skill/SkillChat";
import SkillPreview from "@/components/crear-skill/SkillPreview";
import SkillPublishConfig from "@/components/crear-skill/SkillPublishConfig";
import type { Msg } from "@/lib/streaming";

type Step = "chat" | "preview" | "publish";

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
}

interface Quality {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

const CrearSkill = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [skill, setSkill] = useState<GeneratedSkill | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-skill", {
        body: { conversation: messages, action: "generate" },
      });
      if (error) throw error;
      setSkill(data.skill);
      setQuality(data.quality);
      setStep("preview");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar la skill. Intentá de nuevo.");
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
      toast.success("Skill actualizada");
    } catch {
      toast.error("Error al refinar la skill.");
    }
    setIsRefining(false);
  };

  const handlePublish = async (config: { category: string; industry: string[]; target_roles: string[] }) => {
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
      });

      toast.success("¡Skill publicada! Será revisada antes de aparecer en el marketplace.");
      navigate("/explorar");
    } catch {
      toast.error("Error al publicar. Intentá de nuevo.");
    }
    setIsPublishing(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-14 flex-1 flex flex-col">
        {step === "chat" && (
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
            <div className="px-4 pt-6 pb-2">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl font-semibold text-foreground">Crear Skill</h1>
                <p className="text-sm text-muted-foreground">Contanos sobre tu expertise y generamos la skill por vos</p>
              </motion.div>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <SkillChat
                messages={messages}
                setMessages={setMessages}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        )}

        {step === "preview" && skill && quality && (
          <div className="max-w-2xl mx-auto w-full px-4 pt-6">
            <SkillPreview
              skill={skill}
              quality={quality}
              onRefine={handleRefine}
              onPublish={() => setStep("publish")}
              onBack={() => setStep("chat")}
              isRefining={isRefining}
            />
          </div>
        )}

        {step === "publish" && skill && (
          <div className="max-w-2xl mx-auto w-full px-4 pt-6">
            <SkillPublishConfig
              initialCategory={skill.category}
              initialIndustry={skill.industry}
              initialRoles={skill.target_roles}
              onPublish={handlePublish}
              onBack={() => setStep("preview")}
              isPublishing={isPublishing}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CrearSkill;
