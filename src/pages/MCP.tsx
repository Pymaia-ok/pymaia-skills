import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server/mcp`;

const mcpConfig = JSON.stringify(
  { mcpServers: { "pymaia-skills": { type: "streamable-http", url: MCP_URL } } },
  null,
  2
);

const MCP = () => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chatExamples = [
    { user: t("mcp.ex1User"), claude: t("mcp.ex1Claude") },
    { user: t("mcp.ex2User"), claude: t("mcp.ex2Claude") },
    { user: t("mcp.ex3User"), claude: t("mcp.ex3Claude") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14 max-w-3xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
          <h1 className="hero-title mb-6 whitespace-pre-line">{t("mcp.heroTitle")}</h1>
          <p className="hero-subtitle max-w-lg mx-auto">{t("mcp.heroSubtitle")}</p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground">
            {t("mcp.compatible")}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-8">{t("mcp.installTitle")}</h2>
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">1</div>
              <div>
                <h3 className="font-semibold mb-2">{t("mcp.step1Title")}</h3>
                <p className="text-sm text-muted-foreground">{t("mcp.step1Desc")}</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">2</div>
              <div>
                <h3 className="font-semibold mb-2">{t("mcp.step2Title")}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t("mcp.step2Desc")}</p>
                <div className="relative p-4 rounded-xl bg-foreground text-background font-mono text-sm">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all">{mcpConfig}</pre>
                  <button onClick={handleCopy} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background/10 transition-colors">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">3</div>
              <div>
                <h3 className="font-semibold mb-2">{t("mcp.step3Title")}</h3>
                <p className="text-sm text-muted-foreground">{t("mcp.step3Desc")}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-8">{t("mcp.toolsTitle")}</h2>
          <div className="space-y-4">
            {[
              { name: "search_skills", desc: t("mcp.tools.search") },
              { name: "get_skill_details", desc: t("mcp.tools.details") },
              { name: "list_popular_skills", desc: t("mcp.tools.popular") },
              { name: "recommend_for_task", desc: t("mcp.tools.recommend") },
              { name: "explore_directory", desc: t("mcp.tools.explore") },
              { name: "search_connectors", desc: t("mcp.tools.searchConnectors") },
              { name: "search_plugins", desc: t("mcp.tools.searchPlugins") },
            ].map((tool) => (
              <div key={tool.name} className="p-5 rounded-2xl bg-secondary">
                <code className="text-sm font-semibold font-mono">{tool.name}</code>
                <p className="text-sm text-muted-foreground mt-1">{tool.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-2xl font-semibold mb-8">{t("mcp.examplesTitle")}</h2>
          <div className="space-y-6">
            {chatExamples.map((ex, i) => (
              <div key={i} className="rounded-2xl bg-secondary p-6">
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">{t("mcp.you")}</p>
                  <p className="text-sm font-medium">{ex.user}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">{t("mcp.claude")}</p>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{ex.claude}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MCP;
