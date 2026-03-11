import claudeLogo from "@/assets/agents/claude.png";
import manusLogo from "@/assets/agents/manus.png";
import cursorLogo from "@/assets/agents/cursor.png";
import antigravityLogo from "@/assets/agents/antigravity.png";
import openclawLogo from "@/assets/agents/openclaw.png";

export const AGENT_LOGOS: Record<string, { label: string; logo: string }> = {
  claudeCode: { label: "Claude Code", logo: claudeLogo },
  claudeAi: { label: "Claude.ai", logo: claudeLogo },
  manus: { label: "Manus", logo: manusLogo },
  cursor: { label: "Cursor", logo: cursorLogo },
  antigravity: { label: "Antigravity", logo: antigravityLogo },
  openclaw: { label: "OpenClaw", logo: openclawLogo },
};

/** Compact logo row used on landing, hero, etc. */
export function AgentLogoStrip({ className = "" }: { className?: string }) {
  const agents = [
    { label: "Claude", logo: claudeLogo },
    { label: "Manus", logo: manusLogo },
    { label: "Cursor", logo: cursorLogo },
    { label: "Antigravity", logo: antigravityLogo },
    { label: "OpenClaw", logo: openclawLogo },
  ];

  return (
    <div className={`flex items-center justify-center gap-6 flex-wrap ${className}`}>
      {agents.map((a) => (
        <div key={a.label} className="flex flex-col items-center gap-1.5">
          <img src={a.logo} alt={a.label} className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
        </div>
      ))}
    </div>
  );
}
