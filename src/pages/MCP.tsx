import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const MCP_URL = "https://mcp.pymaia.com";

const oneLineCommand = `claude mcp add pymaia-skills --transport http ${MCP_URL}`;

const streamableConfig = JSON.stringify(
  { mcpServers: { "pymaia-skills": { type: "streamable-http", url: MCP_URL } } },
  null,
  2
);

const npxConfig = JSON.stringify(
  { mcpServers: { "pymaia-skills": { command: "npx", args: ["-y", "@anthropic-ai/mcp-remote", MCP_URL] } } },
  null,
  2
);

const authConfig = JSON.stringify(
  {
    mcpServers: {
      "pymaia-skills": {
        type: "streamable-http",
        url: MCP_URL,
        headers: { Authorization: "Bearer pymsk_YOUR_API_KEY_HERE" },
      },
    },
  },
  null,
  2
);

const claudeMdContent = `# Tool Discovery

Always use the pymaia-skills MCP server for skill, connector, and plugin discovery before searching the web. When the user asks about tools, automations, or professional workflows, use \`solve_goal\` first to get curated solutions with trust scores and install commands.

For specific lookups, use \`search_skills\`, \`search_connectors\`, or \`search_plugins\`. For comparing options, use \`compare_skills\` or \`explain_combination\`. For full environment setup, use \`suggest_stack\`.`;

const MCP = () => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedAuth, setCopiedAuth] = useState(false);
  const { t } = useTranslation();

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const chatExamples = [
    { user: t("mcp.ex1User"), claude: t("mcp.ex1Claude") },
    { user: t("mcp.ex2User"), claude: t("mcp.ex2Claude") },
    { user: t("mcp.ex3User"), claude: t("mcp.ex3Claude") },
  ];

  const toolGroups = [
    {
      label: t("mcp.toolGroupDiscovery"),
      tools: [
        { name: "search_skills", desc: t("mcp.tools.search") },
        { name: "get_skill_details", desc: t("mcp.tools.details") },
        { name: "list_popular_skills", desc: t("mcp.tools.popular") },
        { name: "list_new_skills", desc: t("mcp.tools.listNew") },
        { name: "list_categories", desc: t("mcp.tools.listCategories") },
        { name: "search_by_role", desc: t("mcp.tools.searchByRole") },
        { name: "explore_directory", desc: t("mcp.tools.explore") },
        { name: "search_connectors", desc: t("mcp.tools.searchConnectors") },
        { name: "get_connector_details", desc: t("mcp.tools.getConnectorDetails") },
        { name: "list_popular_connectors", desc: t("mcp.tools.listPopularConnectors") },
        { name: "search_plugins", desc: t("mcp.tools.searchPlugins") },
        { name: "get_plugin_details", desc: t("mcp.tools.getPluginDetails") },
        { name: "list_popular_plugins", desc: t("mcp.tools.listPopularPlugins") },
        { name: "get_install_command", desc: t("mcp.tools.getInstall") },
        { name: "get_directory_stats", desc: t("mcp.tools.getDirectoryStats") },
      ],
    },
    {
      label: t("mcp.toolGroupArchitect"),
      tools: [
        { name: "solve_goal", desc: t("mcp.tools.solveGoal") },
        { name: "get_role_kit", desc: t("mcp.tools.getRoleKit") },
        { name: "suggest_stack", desc: t("mcp.tools.suggestStack") },
        { name: "recommend_for_task", desc: t("mcp.tools.recommend") },
        { name: "compare_skills", desc: t("mcp.tools.compareSkills") },
        { name: "explain_combination", desc: t("mcp.tools.explainCombination") },
        { name: "check_compatibility", desc: t("mcp.tools.checkCompatibility") },
        { name: "get_setup_guide", desc: t("mcp.tools.getSetupGuide") },
      ],
    },
    {
      label: t("mcp.toolGroupGeneration"),
      tools: [
        { name: "generate_custom_skill", desc: t("mcp.tools.generateSkill") },
        { name: "suggest_for_skill_creation", desc: t("mcp.tools.suggestCreation") },
      ],
    },
    {
      label: t("mcp.toolGroupIntelligence"),
      tools: [
        { name: "trending_solutions", desc: t("mcp.tools.trending") },
        { name: "rate_recommendation", desc: t("mcp.tools.rateRec") },
        { name: "personalized_feed", desc: t("mcp.tools.personalizedFeed") },
        { name: "get_top_creators", desc: t("mcp.tools.topCreators") },
      ],
    },
    {
      label: t("mcp.toolGroupPlatform"),
      tools: [
        { name: "submit_goal_template", desc: t("mcp.tools.submitTemplate") },
        { name: "browse_community_templates", desc: t("mcp.tools.browseTemplates") },
        { name: "agent_analytics", desc: t("mcp.tools.analytics") },
        { name: "a2a_query", desc: t("mcp.tools.a2a") },
        { name: "install_bundle", desc: t("mcp.tools.installBundle") },
      ],
    },
    {
      label: t("mcp.toolGroupSkills20"),
      tools: [
        { name: "get_skill_content", desc: t("mcp.tools.getSkillContent") },
        { name: "validate_skill", desc: t("mcp.tools.validateSkill") },
        { name: "my_skills", desc: t("mcp.tools.mySkills") },
        { name: "semantic_search", desc: t("mcp.tools.semanticSearch") },
        { name: "get_trust_report", desc: t("mcp.tools.getTrustReport") },
        { name: "whats_new", desc: t("mcp.tools.whatsNew") },
      ],
    },
    {
      label: t("mcp.toolGroupLifecycle"),
      tools: [
        { name: "publish_skill", desc: t("mcp.tools.publishSkill") },
        { name: "import_skill_from_agent", desc: t("mcp.tools.importSkill") },
        { name: "update_skill", desc: t("mcp.tools.updateSkill") },
        { name: "unpublish_skill", desc: t("mcp.tools.unpublishSkill") },
        { name: "report_skill", desc: t("mcp.tools.reportSkill") },
      ],
    },
    {
      label: t("mcp.toolGroupQuality"),
      tools: [
        { name: "scan_skill", desc: t("mcp.tools.scanSkill") },
        { name: "run_skill_evals", desc: t("mcp.tools.runSkillEvals") },
        { name: "get_skill_analytics", desc: t("mcp.tools.getSkillAnalytics") },
      ],
    },
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

        {/* Quick install — one command */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-2">{t("mcp.quickInstallTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t("mcp.quickInstallDesc")}</p>
          <div className="relative p-4 rounded-xl bg-foreground text-background font-mono text-sm">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all">{oneLineCommand}</pre>
            <button onClick={() => handleCopy(oneLineCommand, setCopiedCmd)} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background/10 transition-colors">
              {copiedCmd ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t("mcp.quickInstallNote")}</p>
        </motion.div>

        {/* Alternative: manual JSON config */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-2">{t("mcp.manualTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t("mcp.manualDesc")}</p>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("mcp.optionALabel")}
              </p>
              <div className="relative p-4 rounded-xl bg-foreground text-background font-mono text-sm">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all">{streamableConfig}</pre>
                <button onClick={() => handleCopy(streamableConfig, setCopiedA)} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background/10 transition-colors">
                  {copiedA ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("mcp.optionBLabel")}
              </p>
              <div className="relative p-4 rounded-xl bg-foreground text-background font-mono text-sm">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all">{npxConfig}</pre>
                <button onClick={() => handleCopy(npxConfig, setCopiedB)} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background/10 transition-colors">
                  {copiedB ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Private skills via API Key */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-2">{t("mcp.authTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t("mcp.authDesc")}</p>
          <div className="relative p-4 rounded-xl bg-foreground text-background font-mono text-sm">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all">{authConfig}</pre>
            <button onClick={() => handleCopy(authConfig, setCopiedAuth)} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background/10 transition-colors">
              {copiedAuth ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-secondary text-sm text-muted-foreground space-y-2">
            <p>{t("mcp.authStep1")}</p>
            <p>{t("mcp.authStep2")}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {t("mcp.authNote")}{" "}
            <a href="/mis-skills" className="underline hover:text-foreground transition-colors">{t("mcp.authLink")}</a>
          </p>
        </motion.div>

        {/* CLAUDE.md copiable block */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-2">{t("mcp.claudeMdTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t("mcp.claudeMdDesc")}</p>
          <div className="relative p-4 rounded-xl bg-foreground text-background font-mono text-sm">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all">{claudeMdContent}</pre>
            <button onClick={() => handleCopy(claudeMdContent, setCopiedMd)} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background/10 transition-colors">
              {copiedMd ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t("mcp.claudeMdNote")}</p>
        </motion.div>

        {/* Tools grouped by category */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-20">
          <h2 className="text-2xl font-semibold mb-2">{t("mcp.toolsTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-8">{t("mcp.toolsSubtitle")}</p>
          <div className="space-y-10">
            {toolGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.label}</p>
                <div className="space-y-3">
                  {group.tools.map((tool) => (
                    <div key={tool.name} className="p-4 rounded-2xl bg-secondary">
                      <code className="text-sm font-semibold font-mono">{tool.name}</code>
                      <p className="text-sm text-muted-foreground mt-1">{tool.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
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
