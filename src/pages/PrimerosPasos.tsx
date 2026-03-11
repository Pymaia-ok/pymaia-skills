import { motion } from "framer-motion";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Download, ExternalLink, Terminal, MessageSquare, Code2, Sparkles,
  ArrowRight, BookOpen, Plug, Puzzle, Zap, Monitor, Globe, Brain,
  FileText, Bot, CheckCircle2, ChevronRight, Lightbulb, Shield,
  Laptop, Chrome, Layout, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/useSEO";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const PrimerosPasos = () => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";

  useSEO({
    title: isEs ? "Primeros Pasos — Guía completa de Skills para agentes AI" : "Getting Started — Complete Guide to AI Agent Skills",
    description: isEs
      ? "Aprende qué son las skills, MCPs y conectores para agentes AI como Claude, Manus, Cursor y más. De cero a experto en 10 minutos."
      : "Learn what skills, MCPs and connectors are for AI agents like Claude, Manus, Cursor and more. From zero to expert in 10 minutes.",
    canonical: "https://pymaiaskills.lovable.app/primeros-pasos",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">

        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
            <motion.div {...fadeUp}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground mb-8 border border-border">
                <BookOpen className="w-4 h-4" />
                {isEs ? "Guía completa · 10 min de lectura" : "Complete guide · 10 min read"}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                {isEs ? "De cero a experto\nen 10 minutos." : "From zero to expert\nin 10 minutes."}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {isEs
                  ? "Todo lo que necesitás saber sobre skills para agentes AI como Claude, Manus, Cursor y más. Sin tecnicismos."
                  : "Everything you need to know about skills for AI agents like Claude, Manus, Cursor and more. No jargon."}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ─── Table of Contents ─── */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <motion.div {...fadeUp} className="p-6 rounded-2xl bg-secondary border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {isEs ? "En esta guía" : "In this guide"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { icon: Brain, label: isEs ? "¿Qué es Claude?" : "What is Claude?", href: "#claude" },
                { icon: Monitor, label: isEs ? "Modos de Claude" : "Claude Modes", href: "#modes" },
                { icon: Sparkles, label: isEs ? "¿Qué son las Skills?" : "What are Skills?", href: "#skills" },
                { icon: Plug, label: isEs ? "Skills, Conectores y Plugins" : "Skills, Connectors & Plugins", href: "#mcps" },
                { icon: Download, label: isEs ? "Instalá Claude Code" : "Install Claude Code", href: "#install" },
                { icon: Zap, label: isEs ? "Tu primera skill en 2 minutos" : "Your first skill in 2 minutes", href: "#first-skill" },
                { icon: Bot, label: isEs ? "Conector de Pymaia Skills" : "Pymaia Skills Connector", href: "#pymaia-mcp" },
              ].map((item) => (
                <a key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors group">
                  <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ─── Section 1: ¿Qué es Claude? ─── */}
        <section id="claude" className="max-w-4xl mx-auto px-6 pb-20 scroll-mt-24">
          <motion.div {...fadeUp}>
            <SectionBadge icon={Brain} label={isEs ? "Lo básico" : "The basics"} />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              {isEs ? "¿Qué es Claude?" : "What is Claude?"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {isEs
                ? "Claude es una inteligencia artificial creada por Anthropic. Pensalo como un asistente superinteligente que puede leer, escribir, analizar datos, programar, y mucho más. Es como tener un equipo de expertos disponible 24/7."
                : "Claude is an AI created by Anthropic. Think of it as a superintelligent assistant that can read, write, analyze data, code, and much more. It's like having a team of experts available 24/7."}
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  emoji: "🧠",
                  title: isEs ? "Entiende contexto" : "Understands context",
                  desc: isEs ? "Lee documentos largos, entiende tu industria y recuerda el contexto de la conversación." : "Reads long documents, understands your industry and remembers conversation context.",
                },
                {
                  emoji: "⚡",
                  title: isEs ? "Ejecuta tareas" : "Executes tasks",
                  desc: isEs ? "No solo responde preguntas — puede crear documentos, analizar datos y automatizar trabajo." : "Doesn't just answer questions — it can create documents, analyze data and automate work.",
                },
                {
                  emoji: "🔒",
                  title: isEs ? "Seguro y privado" : "Safe and private",
                  desc: isEs ? "Anthropic diseñó Claude con seguridad en mente. Tus datos no se usan para entrenar el modelo." : "Anthropic designed Claude with safety in mind. Your data isn't used to train the model.",
                },
              ].map((card) => (
                <div key={card.title} className="p-5 rounded-2xl bg-secondary border border-border">
                  <span className="text-2xl mb-3 block">{card.emoji}</span>
                  <h3 className="font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ─── Section 2: Modos de Claude ─── */}
        <section id="modes" className="max-w-4xl mx-auto px-6 pb-20 scroll-mt-24">
          <motion.div {...fadeUp}>
            <SectionBadge icon={Monitor} label={isEs ? "Interfaces" : "Interfaces"} />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {isEs ? "Las formas de usar Claude" : "Ways to use Claude"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {isEs
                ? "Claude se puede usar de distintas formas. Cada una tiene un propósito diferente."
                : "Claude can be used in different ways. Each serves a different purpose."}
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: MessageSquare,
                  name: "Chat (claude.ai)",
                  tag: isEs ? "Conversación" : "Conversation",
                  desc: isEs
                    ? "La forma clásica de usar Claude. Abrís claude.ai o la app de escritorio, y chateás. Ideal para preguntas rápidas, brainstorming, redacción, análisis de documentos y búsquedas web."
                    : "The classic way to use Claude. Open claude.ai or the desktop app, and chat. Ideal for quick questions, brainstorming, writing, document analysis and web search.",
                  color: "bg-secondary",
                },
                {
                  icon: Layout,
                  name: "Cowork",
                  tag: isEs ? "Trabajo autónomo · Nuevo" : "Autonomous work · New",
                  desc: isEs
                    ? "El modo más nuevo de Claude. Cowork permite que Claude trabaje de forma autónoma en tareas largas mientras vos hacés otra cosa. Claude puede leer archivos, navegar la web, conectarse a herramientas externas y entregar resultados completos. Pensalo como un asistente que trabaja en paralelo."
                    : "Claude's newest mode. Cowork lets Claude work autonomously on long tasks while you do other things. Claude can read files, browse the web, connect to external tools and deliver complete results. Think of it as an assistant working in parallel.",
                  color: "bg-secondary",
                },
                {
                  icon: Terminal,
                  name: "Claude Code",
                  tag: isEs ? "El más potente · Para skills" : "Most powerful · For skills",
                  desc: isEs
                    ? "Claude en tu computadora, con acceso total a tus archivos y terminal. Puede leer proyectos, modificar documentos, ejecutar comandos y usar skills. Es el modo que usamos en Pymaia Skills. Disponible en 5 superficies: Terminal (CLI), app de escritorio, VS Code, JetBrains, y la web."
                    : "Claude on your computer, with full access to your files and terminal. It can read projects, modify documents, run commands and use skills. This is the mode we use in Pymaia Skills. Available on 5 surfaces: Terminal (CLI), desktop app, VS Code, JetBrains, and the web.",
                  color: "bg-foreground/5 border-2 border-foreground/20",
                  highlight: true,
                  surfaces: isEs
                    ? ["Terminal (CLI)", "App de escritorio", "VS Code / Cursor", "JetBrains", "Web (claude.ai/code)"]
                    : ["Terminal (CLI)", "Desktop app", "VS Code / Cursor", "JetBrains", "Web (claude.ai/code)"],
                },
                {
                  icon: Globe,
                  name: "API",
                  tag: isEs ? "Para desarrolladores" : "For developers",
                  desc: isEs
                    ? "Acceso programático a Claude para construir apps, automatizaciones y agentes personalizados. Incluye el Agent SDK para crear workflows avanzados."
                    : "Programmatic access to Claude for building apps, automations and custom agents. Includes the Agent SDK for advanced workflows.",
                  color: "bg-secondary",
                },
              ].map((mode) => (
                <div
                  key={mode.name}
                  className={`p-6 rounded-2xl ${mode.color} flex flex-col sm:flex-row gap-4 items-start transition-colors`}
                >
                  <div className="p-3 rounded-xl bg-background border border-border flex-shrink-0">
                    <mode.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{mode.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${(mode as any).highlight ? "bg-foreground text-background" : "bg-accent text-muted-foreground"}`}>
                        {mode.tag}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{mode.desc}</p>
                    {(mode as any).surfaces && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(mode as any).surfaces.map((s: string) => (
                          <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing note */}
            <div className="mt-6 p-4 rounded-xl bg-secondary border border-border">
              <p className="text-sm text-muted-foreground">
                {isEs
                  ? "💡 Chat es gratis con límites. Claude Code y Cowork requieren un plan Pro ($20/mes) o Max ($100/mes). Todos los planes incluyen skills."
                  : "💡 Chat is free with limits. Claude Code and Cowork require a Pro ($20/mo) or Max ($100/mo) plan. All plans include skills."}
              </p>
            </div>
          </motion.div>
        </section>

        {/* ─── Section 3: ¿Qué son las Skills? ─── */}
        <section id="skills" className="max-w-4xl mx-auto px-6 pb-20 scroll-mt-24">
          <motion.div {...fadeUp}>
            <SectionBadge icon={Sparkles} label="Skills" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {isEs ? "¿Qué son las Skills?" : "What are Skills?"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {isEs
                ? "Una skill es un archivo de conocimiento experto (SKILL.md) que le enseña a un agente AI cómo hacer una tarea específica. No es un plugin, no es una app — es conocimiento puro que el agente usa automáticamente. Funciona con Claude, Manus, Cursor, Antigravity, OpenClaw y cualquier agente compatible con el estándar SKILL.md."
                : "A skill is an expert knowledge file (SKILL.md) that teaches an AI agent how to do a specific task. It's not a plugin, not an app — it's pure knowledge that the agent uses automatically. Works with Claude, Manus, Cursor, Antigravity, OpenClaw and any agent supporting the SKILL.md standard."}
            </p>

            {/* Visual analogy */}
            <div className="p-6 rounded-2xl bg-secondary border border-border mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">{isEs ? "Analogía simple" : "Simple analogy"}</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="text-center p-5 rounded-xl bg-background border border-border">
                  <span className="text-4xl mb-3 block">👨‍🍳</span>
                  <p className="text-sm text-muted-foreground">
                    {isEs
                      ? "Claude sin skills es como un chef con talento pero sin recetas."
                      : "Claude without skills is like a talented chef without recipes."}
                  </p>
                </div>
                <div className="text-center p-5 rounded-xl bg-background border border-border">
                  <span className="text-4xl mb-3 block">📖</span>
                  <p className="text-sm text-muted-foreground">
                    {isEs
                      ? "Las skills son las recetas. Le das el conocimiento exacto para que haga el trabajo perfecto."
                      : "Skills are the recipes. You give it the exact knowledge to do the job perfectly."}
                  </p>
                </div>
              </div>
            </div>

            {/* Where skills work — 3 surfaces */}
            <div className="p-6 rounded-2xl bg-secondary border border-border mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">{isEs ? "Dónde funcionan las skills" : "Where skills work"}</h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {[
                  {
                    emoji: "💬",
                    name: "Claude.ai",
                    desc: isEs
                      ? "Subí un ZIP con tu skill desde Settings → Features. Funciona en Chat y Cowork."
                      : "Upload a ZIP with your skill from Settings → Features. Works in Chat and Cowork.",
                    tag: isEs ? "Upload ZIP" : "Upload ZIP",
                  },
                  {
                    emoji: "⌨️",
                    name: "Claude Code",
                    desc: isEs
                      ? "Guardá el SKILL.md en la carpeta .claude/skills/ de tu proyecto. Se activa automáticamente."
                      : "Save the SKILL.md in your project's .claude/skills/ folder. Activates automatically.",
                    tag: isEs ? "Carpeta local" : "Local folder",
                  },
                  {
                    emoji: "🔗",
                    name: "API",
                    desc: isEs
                      ? "Subí skills via /v1/skills para agentes y automatizaciones programáticas."
                      : "Upload skills via /v1/skills for programmatic agents and automations.",
                    tag: isEs ? "Endpoint" : "Endpoint",
                  },
                ].map((surface) => (
                  <div key={surface.name} className="p-4 rounded-xl bg-background border border-border text-center">
                    <span className="text-2xl mb-2 block">{surface.emoji}</span>
                    <p className="font-semibold text-sm mb-1">{surface.name}</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{surface.tag}</span>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{surface.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {isEs
                  ? "⚠️ Las skills no se sincronizan entre superficies. Hay que instalarlas por separado en cada una."
                  : "⚠️ Skills don't sync between surfaces. You need to install them separately on each one."}
              </p>
            </div>

            {/* Progressive disclosure */}
            <div className="p-6 rounded-2xl bg-secondary border border-border mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">{isEs ? "¿Muchas skills = lento?" : "Many skills = slow?"}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isEs
                  ? "No. Claude usa progressive disclosure: carga las skills en 3 niveles según las necesita."
                  : "No. Claude uses progressive disclosure: it loads skills in 3 levels as needed."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { level: "1", label: isEs ? "Metadata" : "Metadata", desc: isEs ? "Siempre cargada (nombre, descripción)" : "Always loaded (name, description)" },
                  { level: "2", label: "SKILL.md", desc: isEs ? "Se lee al activar la skill" : "Read when skill activates" },
                  { level: "3", label: isEs ? "Recursos" : "Resources", desc: isEs ? "Scripts y archivos, bajo demanda" : "Scripts and files, on demand" },
                ].map((l) => (
                  <div key={l.level} className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                    <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold flex-shrink-0">{l.level}</div>
                    <div>
                      <p className="text-xs font-semibold">{l.label}</p>
                      <p className="text-[10px] text-muted-foreground">{l.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-built skills note */}
            <div className="p-4 rounded-xl bg-accent/50 border border-border mb-8">
              <p className="text-sm text-muted-foreground">
                {isEs
                  ? "📎 Claude ya viene con skills pre-instaladas para PowerPoint, Excel, Word y PDF. No necesitás instalar nada para esos."
                  : "📎 Claude comes with pre-installed skills for PowerPoint, Excel, Word and PDF. No setup needed for those."}
              </p>
            </div>

            {/* Before/After */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-destructive/5">
                <p className="text-sm font-semibold text-destructive mb-3">{isEs ? "❌ Sin skill" : "❌ Without skill"}</p>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {isEs
                    ? '"Claude, haceme un brief de campaña" → Te da algo genérico, sin estructura, sin KPIs, sin investigación.'
                    : '"Claude, write me a campaign brief" → You get something generic, no structure, no KPIs, no research.'}
                </p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-emerald-500/5">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">{isEs ? "✅ Con skill" : "✅ With skill"}</p>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {isEs
                    ? '"Claude, haceme un brief de campaña" → Brief completo con objetivos, audiencia, KPIs, timeline, presupuesto y referencias. En 3 minutos.'
                    : '"Claude, write me a campaign brief" → Complete brief with objectives, audience, KPIs, timeline, budget and references. In 3 minutes.'}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Section 4: Ecosistema de plugins ─── */}
        <section id="mcps" className="max-w-4xl mx-auto px-6 pb-20 scroll-mt-24">
          <motion.div {...fadeUp}>
            <SectionBadge icon={Plug} label="Plugins" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {isEs ? "El ecosistema de Claude:\nSkills, Conectores y Plugins" : "Claude's ecosystem:\nSkills, Connectors & Plugins"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {isEs
                ? "Hay 3 formas de extender lo que Claude puede hacer. Cada una tiene un propósito distinto:"
                : "There are 3 ways to extend what Claude can do. Each serves a different purpose:"}
            </p>

            <div className="space-y-4 mb-8">
              {[
                {
                  icon: FileText,
                  emoji: "🧠",
                  name: "Skill",
                  what: isEs ? "Archivo de conocimiento (SKILL.md)" : "Knowledge file (SKILL.md)",
                  does: isEs
                    ? "Le enseña a Claude CÓMO hacer una tarea específica. Es como darle un manual de experto. No se conecta a nada externo — solo le da conocimiento. Las skills son archivos Markdown que Claude lee automáticamente cuando detecta que son relevantes."
                    : "Teaches Claude HOW to do a specific task. Like giving it an expert manual. Doesn't connect to anything external — just gives it knowledge. Skills are Markdown files that Claude reads automatically when it detects they're relevant.",
                  example: isEs ? "Skill de briefs → Claude sabe hacer briefs profesionales" : "Brief skill → Claude knows how to write professional briefs",
                  category: isEs ? "Conocimiento" : "Knowledge",
                },
                {
                  icon: Plug,
                  emoji: "🔌",
                  name: isEs ? "MCP / Conector" : "MCP / Connector",
                  what: isEs ? "Servidor que conecta Claude con herramientas externas (MCP = Model Context Protocol)" : "Server connecting Claude to external tools (MCP = Model Context Protocol)",
                  does: isEs
                    ? "Le da a Claude ACCESO a datos y servicios en tiempo real. MCP es un estándar abierto creado por Anthropic. Un MCP Server y un conector son lo mismo: un puente entre Claude y herramientas como Slack, GitHub, Google Drive, bases de datos, etc."
                    : "Gives Claude ACCESS to real-time data and services. MCP is an open standard created by Anthropic. An MCP Server and a connector are the same thing: a bridge between Claude and tools like Slack, GitHub, Google Drive, databases, etc.",
                  example: isEs ? "Conector de Slack → Claude puede leer y enviar mensajes en Slack" : "Slack connector → Claude can read and send messages in Slack",
                  category: isEs ? "Acceso" : "Access",
                },
                {
                  icon: Chrome,
                  emoji: "🧩",
                  name: "Plugin",
                  what: isEs ? "Paquetes que combinan tools, skills e integraciones en un click" : "Packages that bundle tools, skills, and integrations for one-click install",
                  does: isEs
                    ? "Los plugins son paquetes listos para instalar desde claude.com/plugins. Combinan skills, herramientas e integraciones en una sola instalación. Ejemplo: el plugin de Frontend Design combina skills de diseño con herramientas para generar código listo para producción."
                    : "Plugins are packages ready to install from claude.com/plugins. They bundle skills, tools, and integrations into a single installation. Example: the Frontend Design plugin combines design skills with tools to generate production-ready code.",
                  example: isEs ? "Plugin Frontend Design → Skills + tools de diseño en un click" : "Frontend Design plugin → Design skills + tools in one click",
                  category: isEs ? "Paquete" : "Package",
                },
              ].map((concept) => (
                <div key={concept.name} className="p-6 rounded-2xl bg-secondary border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-background border border-border">
                      <concept.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{concept.name}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{concept.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{concept.what}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-3">{concept.does}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">{isEs ? "Ejemplo:" : "Example:"}</span>
                    <span className="text-xs text-foreground bg-accent px-2.5 py-1 rounded-full">{concept.example}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual comparison */}
            <div className="p-6 rounded-2xl bg-foreground text-background">
              <h3 className="font-semibold mb-4 text-lg">{isEs ? "En resumen" : "In summary"}</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-background/10">
                  <p className="font-semibold mb-1">🧠 Skills</p>
                  <p className="text-sm opacity-80">{isEs ? "Le enseñan CÓMO hacer algo" : "Teach HOW to do something"}</p>
                </div>
                <div className="p-4 rounded-xl bg-background/10">
                  <p className="font-semibold mb-1">🔌 MCPs / Conectores</p>
                  <p className="text-sm opacity-80">{isEs ? "Le dan ACCESO a herramientas" : "Give ACCESS to tools"}</p>
                </div>
                <div className="p-4 rounded-xl bg-background/10">
                  <p className="font-semibold mb-1">🧩 Plugins</p>
                  <p className="text-sm opacity-80">{isEs ? "Combinan todo en UN PAQUETE instalable" : "Bundle everything in ONE installable PACKAGE"}</p>
                </div>
              </div>
              <p className="text-sm opacity-70 mt-4">
                {isEs
                  ? "💡 Lo más potente: combinar los tres. Ej: Skill de análisis + Conector de Google Sheets = Claude analiza tus datos directamente."
                  : "💡 Most powerful: combine all three. E.g.: Analysis skill + Google Sheets connector = Claude analyzes your data directly."}
              </p>
            </div>
          </motion.div>
        </section>

        {/* ─── Section 5: Instalá Claude Code ─── */}
        <section id="install" className="max-w-4xl mx-auto px-6 pb-20 scroll-mt-24">
          <motion.div {...fadeUp}>
            <SectionBadge icon={Download} label={isEs ? "Instalación" : "Installation"} />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {isEs ? "Instalá Claude Code" : "Install Claude Code"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {isEs
                ? "Para usar skills necesitás Claude Code. La instalación es simple y tarda menos de 5 minutos."
                : "To use skills you need Claude Code. Installation is simple and takes less than 5 minutes."}
            </p>

            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: isEs ? "Descargá Claude Code" : "Download Claude Code",
                  desc: isEs
                    ? "Andá a claude.ai/download y descargá la versión para tu sistema operativo (Mac, Windows o Linux)."
                    : "Go to claude.ai/download and download the version for your OS (Mac, Windows or Linux).",
                  cta: { label: isEs ? "Descargar Claude Code" : "Download Claude Code", url: "https://claude.ai/download" },
                },
                {
                  step: 2,
                  title: isEs ? "Instalá y abrí la app" : "Install and open the app",
                  desc: isEs
                    ? "Seguí las instrucciones de instalación. Una vez instalada, abrí la terminal y escribí 'claude' para iniciar."
                    : "Follow the installation instructions. Once installed, open the terminal and type 'claude' to start.",
                },
                {
                  step: 3,
                  title: isEs ? "Iniciá sesión" : "Sign in",
                  desc: isEs
                    ? "La primera vez te va a pedir que te autentiques con tu cuenta de Anthropic. Si no tenés una, podés crearla gratis."
                    : "The first time it will ask you to authenticate with your Anthropic account. If you don't have one, you can create it for free.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-base font-bold">
                    {item.step}
                  </div>
                  <div className="flex-1 pb-6 border-b border-border">
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                    {item.cta && (
                      <a href={item.cta.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block">
                        <Button variant="default" size="sm" className="rounded-full gap-2">
                          <Download className="w-4 h-4" />
                          {item.cta.label}
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ─── Section 6: Tu primera skill ─── */}
        <section id="first-skill" className="max-w-4xl mx-auto px-6 pb-20 scroll-mt-24">
          <motion.div {...fadeUp}>
            <SectionBadge icon={Zap} label={isEs ? "Manos a la obra" : "Hands on"} />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {isEs ? "Instalá tu primera skill" : "Install your first skill"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {isEs
                ? "Ahora que tenés Claude Code, instalemos una skill en 2 minutos."
                : "Now that you have Claude Code, let's install a skill in 2 minutes."}
            </p>

            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: isEs ? "Elegí una skill" : "Pick a skill",
                  desc: isEs
                    ? "Andá a Explorar Skills y buscá algo que te sirva. Por ejemplo, buscá 'brief' si sos de marketing."
                    : "Go to Explore Skills and search for something useful. For example, search 'brief' if you're in marketing.",
                },
                {
                  step: "2",
                  title: isEs ? 'Hacé clic en "Instalar skill"' : 'Click "Install skill"',
                  desc: isEs
                    ? "Esto copia un comando a tu portapapeles. Es una sola línea que le dice a Claude dónde encontrar la skill."
                    : "This copies a command to your clipboard. It's a single line that tells Claude where to find the skill.",
                },
                {
                  step: "3",
                  title: isEs ? "Pegá el comando en Claude Code" : "Paste the command in Claude Code",
                  desc: isEs
                    ? "Abrí Claude Code, pegá el comando y presioná Enter. Claude va a descargar e instalar la skill automáticamente."
                    : "Open Claude Code, paste the command and press Enter. Claude will download and install the skill automatically.",
                },
                {
                  step: "✓",
                  title: isEs ? "¡Listo! Usá la skill" : "Done! Use the skill",
                  desc: isEs
                    ? "Ahora simplemente pedile a Claude que haga la tarea. La skill se activa automáticamente cuando detecta que la necesita."
                    : "Now simply ask Claude to do the task. The skill activates automatically when it detects it's needed.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${
                    item.step === "✓" ? "bg-emerald-500 text-white" : "bg-secondary text-foreground border border-border"
                  }`}>
                    {item.step === "✓" ? <CheckCircle2 className="w-5 h-5" /> : item.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <Link to="/explorar">
                <Button size="lg" className="rounded-full text-base px-8 h-12 gap-2">
                  {isEs ? "Explorar skills" : "Explore skills"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ─── Section 7: Conector de Pymaia Skills ─── */}
        <section id="pymaia-mcp" className="max-w-4xl mx-auto px-6 pb-20 scroll-mt-24">
          <motion.div {...fadeUp}>
            <SectionBadge icon={Bot} label={isEs ? "Conector" : "Connector"} />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {isEs ? "Instalá el Conector de Pymaia Skills" : "Install the Pymaia Skills Connector"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {isEs
                ? "En vez de buscar skills manualmente, instalá nuestro conector y Claude analiza tu objetivo para recomendarte la solución completa: skills, conectores y plugins combinados."
                : "Instead of searching for skills manually, install our connector and Claude analyzes your goal to recommend the complete solution: skills, connectors and plugins combined."}
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  emoji: "🧠",
                  title: isEs ? "Arquitecto de soluciones" : "Solutions architect",
                  desc: isEs
                    ? "Describí tu objetivo y Claude te arma la solución completa con opciones A y B, scores de confianza y pasos de instalación."
                    : "Describe your goal and Claude builds the complete solution with options A and B, trust scores and install steps.",
                },
                {
                  emoji: "🎯",
                  title: isEs ? "Kits por rol" : "Role-based kits",
                  desc: isEs
                    ? "Decile tu rol y te arma un kit personalizado de skills listo para instalar."
                    : "Tell it your role and it builds a personalized skill kit ready to install.",
                },
                {
                  emoji: "⚡",
                  title: isEs ? "Instalación directa" : "Direct installation",
                  desc: isEs
                    ? "Claude instala las skills sin que salgas de la terminal."
                    : "Claude installs skills without you leaving the terminal.",
                },
              ].map((card) => (
                <div key={card.title} className="p-5 rounded-2xl bg-secondary border border-border">
                  <span className="text-2xl mb-3 block">{card.emoji}</span>
                  <h3 className="font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Install command */}
            <div className="p-6 rounded-2xl bg-foreground text-background">
              <p className="text-sm opacity-60 mb-3 font-mono">
                {isEs ? "Pegá esto en tu terminal:" : "Paste this in your terminal:"}
              </p>
              <div className="p-4 rounded-xl bg-background/10 font-mono text-sm break-all">
                claude mcp add pymaia-skills --transport http https://mcp.pymaia.com
              </div>
              <p className="text-sm opacity-60 mt-4">
                {isEs
                  ? "Eso es todo. La próxima vez que abras Claude Code, ya va a tener acceso al catálogo completo de Pymaia Skills."
                  : "That's it. Next time you open Claude Code, it'll have access to the full Pymaia Skills catalog."}
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link to="/mcp">
                <Button variant="outline" size="lg" className="rounded-full text-base px-8 h-12 gap-2">
                  {isEs ? "Más sobre el conector" : "More about the connector"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ─── Bonus: Tips ─── */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <motion.div {...fadeUp}>
            <div className="p-8 rounded-2xl bg-secondary border border-border">
              <h2 className="text-2xl font-bold mb-6">{isEs ? "💡 Tips avanzados" : "💡 Pro tips"}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: isEs ? "Instalá el MCP Server" : "Install the MCP Server",
                    desc: isEs
                      ? "Con el MCP Server de Pymaia, Claude te recomienda skills automáticamente mientras trabajás."
                      : "With the Pymaia MCP Server, Claude automatically recommends skills while you work.",
                    link: "/mcp",
                    cta: isEs ? "Ver cómo" : "Learn how",
                  },
                  {
                    title: isEs ? "Combiná skills + conectores" : "Combine skills + connectors",
                    desc: isEs
                      ? "Las skills más potentes usan conectores. Por ejemplo: skill de análisis + conector de Google Sheets."
                      : "The most powerful skills use connectors. For example: analysis skill + Google Sheets connector.",
                    link: "/conectores",
                    cta: isEs ? "Ver conectores" : "View connectors",
                  },
                  {
                    title: isEs ? "Creá tus propias skills" : "Create your own skills",
                    desc: isEs
                      ? "¿Tenés un proceso que repetís siempre? Convertilo en una skill y compartilo con tu equipo."
                      : "Have a process you repeat constantly? Turn it into a skill and share it with your team.",
                    link: "/publicar",
                    cta: isEs ? "Publicar skill" : "Publish skill",
                  },
                  {
                    title: isEs ? "Accedé a skills privadas" : "Access private skills",
                    desc: isEs
                      ? "Generá una API key para que el MCP Server incluya tus skills privadas en las búsquedas de Claude."
                      : "Generate an API key so the MCP Server includes your private skills in Claude's searches.",
                    link: "/mis-skills",
                    cta: isEs ? "Generar API key" : "Generate API key",
                  },
                ].map((tip) => (
                  <Link key={tip.title} to={tip.link} className="p-5 rounded-xl bg-background border border-border hover:border-foreground/20 transition-colors group block">
                    <h3 className="font-semibold mb-2">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{tip.desc}</p>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1 group-hover:gap-2 transition-all">
                      {tip.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

/* ─── Small helpers ─── */
function SectionBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground mb-4 border border-border">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

export default PrimerosPasos;
