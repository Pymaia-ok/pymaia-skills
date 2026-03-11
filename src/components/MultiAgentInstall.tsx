import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Download, FileArchive, Terminal, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

type ItemType = "skill" | "connector" | "plugin";

interface MultiAgentInstallProps {
  itemType: ItemType;
  itemName: string;
  itemSlug: string;
  /** For skills: the SKILL.md content (install_command field). For connectors: JSON config. For plugins: plugin command */
  installContent: string;
  /** Optional GitHub URL for the item */
  githubUrl?: string | null;
  /** Callback after copy/download for tracking */
  onInstallAction?: (agent: string, method: string) => void;
  /** For plugins: cowork URL */
  coworkUrl?: string;
  /** For plugins: show cowork tab */
  showCowork?: boolean;
}

const AGENTS = {
  claudeCode: { label: "Claude Code", icon: "⌨️" },
  claudeAi: { label: "Claude.ai", icon: "🌐" },
  manus: { label: "Manus", icon: "🤖" },
  cursor: { label: "Cursor", icon: "📝" },
  antigravity: { label: "Antigravity", icon: "🚀" },
  openclaw: { label: "OpenClaw", icon: "🐾" },
} as const;

export default function MultiAgentInstall({
  itemType, itemName, itemSlug, installContent, githubUrl, onInstallAction, coworkUrl, showCowork,
}: MultiAgentInstallProps) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const copyText = (text: string, agent: string, method = "copy") => {
    navigator.clipboard.writeText(text);
    setCopiedTab(agent);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success(isEs ? "¡Copiado!" : "Copied!");
    onInstallAction?.(agent, method);
  };

  const downloadZip = async (agent: string) => {
    const zip = new JSZip();
    const folderName = itemSlug || itemName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    zip.file(`${folderName}/SKILL.md`, installContent);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${folderName}.zip`; a.click();
    URL.revokeObjectURL(url);
    toast.success(isEs ? "ZIP descargado" : "ZIP downloaded");
    onInstallAction?.(agent, "zip");
  };

  const CopyBlock = ({ text, agent }: { text: string; agent: string }) => (
    <div
      onClick={() => copyText(text, agent)}
      className="flex items-center justify-between p-4 rounded-xl bg-foreground text-background cursor-pointer hover:opacity-90 transition-opacity group"
    >
      <code className="text-sm font-mono break-all">{text}</code>
      {copiedTab === agent ? <Check className="w-4 h-4 flex-shrink-0 ml-3" /> : <Copy className="w-4 h-4 flex-shrink-0 ml-3 opacity-60 group-hover:opacity-100" />}
    </div>
  );

  const SecondaryBlock = ({ text, agent, label }: { text: string; agent: string; label?: string }) => (
    <div>
      {label && <p className="text-xs text-muted-foreground mb-1.5">{label}</p>}
      <div
        onClick={() => copyText(text, agent)}
        className="flex items-center justify-between p-3 rounded-xl bg-secondary cursor-pointer hover:bg-accent transition-colors group"
      >
        <code className="text-xs text-foreground font-mono break-all whitespace-pre-wrap">{text}</code>
        {copiedTab === agent ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-2" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0 ml-2" />}
      </div>
    </div>
  );

  // ── Skills ──
  if (itemType === "skill") {
    const cliCmd = `claude skill add ${githubUrl || itemSlug}`;
    const folderName = itemSlug || itemName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return (
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-3">
          {isEs ? "Instalar en" : "Install in"}
        </p>
        <Tabs defaultValue="claudeCode" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary/50 p-1.5 rounded-xl">
            {Object.entries(AGENTS).map(([key, { label }]) => (
              <TabsTrigger key={key} value={key} className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="claudeCode" className="mt-3 space-y-3">
            <CopyBlock text={cliCmd} agent="claudeCode" />
            <p className="text-xs text-muted-foreground">
              {isEs ? "Pegá este comando en Claude Code y listo." : "Paste this command in Claude Code and you're done."}
            </p>
          </TabsContent>

          <TabsContent value="claudeAi" className="mt-3 space-y-3">
            <button onClick={() => downloadZip("claudeAi")} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-opacity">
              <FileArchive className="w-5 h-5" />
              {isEs ? "Descargar ZIP" : "Download ZIP"}
            </button>
            <p className="text-xs text-muted-foreground">
              {isEs ? "Descargá el ZIP y subilo en Claude.ai → Settings → Features → Skills." : "Download the ZIP and upload it in Claude.ai → Settings → Features → Skills."}
            </p>
          </TabsContent>

          <TabsContent value="manus" className="mt-3 space-y-3">
            <button onClick={() => downloadZip("manus")} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-opacity">
              <FileArchive className="w-5 h-5" />
              {isEs ? "Descargar ZIP" : "Download ZIP"}
            </button>
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-secondary transition-colors text-sm">
                <ExternalLink className="w-4 h-4" />
                {isEs ? "Importar desde GitHub" : "Import from GitHub"}
              </a>
            )}
            <p className="text-xs text-muted-foreground">
              {isEs ? "Subí el ZIP a tu workspace de Manus, o importá directamente desde GitHub." : "Upload the ZIP to your Manus workspace, or import directly from GitHub."}
            </p>
          </TabsContent>

          <TabsContent value="cursor" className="mt-3 space-y-3">
            <SecondaryBlock text={`cp ${folderName}/SKILL.md .cursor/skills/${folderName}.md`} agent="cursor" />
            <p className="text-xs text-muted-foreground">
              {isEs ? "Copiá el archivo SKILL.md a la carpeta .cursor/skills/ de tu proyecto." : "Copy the SKILL.md file to the .cursor/skills/ folder in your project."}
            </p>
          </TabsContent>

          <TabsContent value="antigravity" className="mt-3 space-y-3">
            <SecondaryBlock text={`cp ${folderName}/SKILL.md .antigravity/skills/${folderName}.md`} agent="antigravity" />
            <p className="text-xs text-muted-foreground">
              {isEs ? "Copiá el archivo SKILL.md a la carpeta .antigravity/skills/ de tu proyecto." : "Copy the SKILL.md file to the .antigravity/skills/ folder in your project."}
            </p>
          </TabsContent>

          <TabsContent value="openclaw" className="mt-3 space-y-3">
            <SecondaryBlock text={`cp ${folderName}/SKILL.md skills/${folderName}.md`} agent="openclaw" />
            <p className="text-xs text-muted-foreground">
              {isEs ? "Copiá el archivo SKILL.md a la carpeta skills/ de tu proyecto." : "Copy the SKILL.md file to the skills/ folder in your project."}
            </p>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── Connectors (MCP) ──
  if (itemType === "connector") {
    let cliCmd = "";
    let jsonConfig = installContent;

    try {
      const parsed = JSON.parse(installContent);
      const serverName = Object.keys(parsed.mcpServers || {})[0];
      const serverConfig = parsed.mcpServers?.[serverName];
      const url = serverConfig?.url;
      if (url && serverName) {
        cliCmd = `claude mcp add ${serverName} --transport http ${url}`;
      }
    } catch {}

    const mcpAgents = [
      { key: "claudeCode", label: "Claude Code" },
      { key: "cursor", label: "Cursor" },
      { key: "antigravity", label: "Antigravity" },
      { key: "openclaw", label: "OpenClaw" },
    ];

    return (
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-3">
          {isEs ? "Instalar en" : "Install in"}
        </p>
        <Tabs defaultValue="claudeCode" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary/50 p-1.5 rounded-xl">
            {mcpAgents.map(({ key, label }) => (
              <TabsTrigger key={key} value={key} className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="claudeCode" className="mt-3 space-y-3">
            {cliCmd && (
              <>
                <p className="text-xs font-medium text-muted-foreground">{isEs ? "Instalación rápida (1 comando)" : "Quick install (1 command)"}</p>
                <CopyBlock text={cliCmd} agent="claudeCode-cli" />
              </>
            )}
            <p className="text-xs font-medium text-muted-foreground mt-2">{isEs ? "Configuración JSON" : "JSON configuration"}</p>
            <SecondaryBlock text={jsonConfig} agent="claudeCode-json" />
            <p className="text-xs text-muted-foreground">
              {isEs ? "Pegá el comando en Claude Code o agregá el JSON en tu configuración MCP." : "Paste the command in Claude Code or add the JSON to your MCP config."}
            </p>
          </TabsContent>

          {["cursor", "antigravity", "openclaw"].map((agent) => (
            <TabsContent key={agent} value={agent} className="mt-3 space-y-3">
              <SecondaryBlock
                text={jsonConfig}
                agent={agent}
                label={isEs ? "Agregá esta configuración JSON en tu cliente" : "Add this JSON config to your client"}
              />
              <p className="text-xs text-muted-foreground">
                {agent === "cursor"
                  ? (isEs ? "Andá a Settings → MCP Servers en Cursor y pegá la configuración." : "Go to Settings → MCP Servers in Cursor and paste the configuration.")
                  : agent === "antigravity"
                  ? (isEs ? "Agregá la configuración en tu archivo de config de Antigravity." : "Add the configuration to your Antigravity config file.")
                  : (isEs ? "Agregá la configuración en tu archivo de config de OpenClaw." : "Add the configuration to your OpenClaw config file.")}
              </p>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // ── Plugins ──
  const pluginAgents = [
    ...(showCowork ? [{ key: "cowork", label: "Claude Cowork" }] : []),
    { key: "claudeCode", label: "Claude Code" },
    { key: "manus", label: "Manus" },
    { key: "cursor", label: "Cursor" },
  ];

  return (
    <div>
      <p className="text-sm font-semibold text-muted-foreground mb-3">
        {isEs ? "Instalar en" : "Install in"}
      </p>
      <Tabs defaultValue={showCowork ? "cowork" : "claudeCode"} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary/50 p-1.5 rounded-xl">
          {pluginAgents.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {showCowork && coworkUrl && (
          <TabsContent value="cowork" className="mt-3 space-y-3">
            <a href={coworkUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-opacity">
              <ExternalLink className="w-5 h-5" />
              {isEs ? "Instalar en Claude Cowork" : "Install in Claude Cowork"}
            </a>
          </TabsContent>
        )}

        <TabsContent value="claudeCode" className="mt-3 space-y-3">
          <CopyBlock text={installContent} agent="claudeCode" />
          <p className="text-xs text-muted-foreground">
            {isEs ? "Pegá este comando en Claude Code." : "Paste this command in Claude Code."}
          </p>
        </TabsContent>

        <TabsContent value="manus" className="mt-3 space-y-3">
          {githubUrl ? (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-opacity">
              <ExternalLink className="w-5 h-5" />
              {isEs ? "Ver en GitHub" : "View on GitHub"}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isEs ? "Instalá el plugin desde GitHub o copiá los archivos manualmente a tu workspace de Manus." : "Install the plugin from GitHub or manually copy files to your Manus workspace."}
            </p>
          )}
        </TabsContent>

        <TabsContent value="cursor" className="mt-3 space-y-3">
          <SecondaryBlock text={installContent} agent="cursor" />
          <p className="text-xs text-muted-foreground">
            {isEs ? "Seguí las instrucciones del plugin para configurarlo en Cursor." : "Follow the plugin instructions to configure it in Cursor."}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
