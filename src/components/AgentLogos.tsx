import claudeLogo from "@/assets/agents/claude.png";
import manusLogo from "@/assets/agents/manus.png";
import cursorLogo from "@/assets/agents/cursor.png";
import antigravityLogo from "@/assets/agents/antigravity.png";
import openclawLogo from "@/assets/agents/openclaw.png";

export const AGENT_LOGOS: Record<string, { label: string; logo: string }> = {
  claudeCode: { label: "Claude Code", logo: claudeLogo },
  claudeAi: { label: "Claude.ai", logo: claudeLogo },
  openclaw: { label: "OpenClaw", logo: openclawLogo },
  manus: { label: "Manus", logo: manusLogo },
  antigravity: { label: "Antigravity", logo: antigravityLogo },
  cursor: { label: "Cursor", logo: cursorLogo },
};

/** Compact logo row used on landing, hero, etc. */
export function AgentLogoStrip({ className = "" }: { className?: string }) {
  const agents = [
    { label: "Claude", logo: claudeLogo },
    { label: "OpenClaw", logo: openclawLogo },
    { label: "Manus", logo: manusLogo },
    { label: "Antigravity", logo: antigravityLogo },
    { label: "Cursor", logo: cursorLogo },
  ];

  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-start md:justify-center gap-8 overflow-x-auto md:overflow-visible md:flex-wrap scrollbar-hide px-4 md:px-0">
        {agents.map((a) => (
          <div key={a.label} className="flex items-center gap-2 shrink-0">
            <img src={a.logo} alt={a.label} className="h-6 w-auto max-w-[120px] object-contain dark:brightness-0 dark:invert" />
          </div>
        ))}
      </div>
    </div>
  );
}
