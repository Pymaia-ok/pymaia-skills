import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSEO } from "@/hooks/useSEO";

interface DetailFAQProps {
  itemType: "skill" | "connector" | "plugin";
  itemName: string;
  description: string;
  category?: string;
  hasApiKey?: boolean;
  securityStatus?: string;
  installCommand?: string;
}

export default function DetailFAQ({ itemType, itemName, description, category, hasApiKey, securityStatus, installCommand }: DetailFAQProps) {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const typeLabel = isEs
    ? { skill: "skill", connector: "conector", plugin: "plugin" }[itemType]
    : itemType;

  const faqs = [
    {
      q: isEs ? `¿Qué es ${itemName}?` : `What is ${itemName}?`,
      a: description || (isEs ? `${itemName} es un ${typeLabel} disponible en Pymaia Skills.` : `${itemName} is a ${typeLabel} available on Pymaia Skills.`),
    },
    {
      q: isEs ? `¿Cómo instalo ${itemName}?` : `How do I install ${itemName}?`,
      a: itemType === "skill"
        ? (isEs
          ? `Elegí tu agente AI favorito (Claude, Manus, Cursor, Antigravity u OpenClaw) en las pestañas de instalación y seguí las instrucciones. En 2 minutos está funcionando.`
          : `Choose your favorite AI agent (Claude, Manus, Cursor, Antigravity or OpenClaw) from the install tabs and follow the instructions. It'll be working in 2 minutes.`)
        : itemType === "connector"
        ? (isEs
          ? `Copiá el comando CLI o la configuración JSON y agregalo a tu configuración de MCP en Claude Code, Cursor o tu cliente preferido.`
          : `Copy the CLI command or JSON config and add it to your MCP configuration in Claude Code, Cursor, or your preferred client.`)
        : (isEs
          ? `Elegí tu agente en las pestañas de instalación: Claude Cowork, Claude Code, Manus o Cursor.`
          : `Choose your agent from the install tabs: Claude Cowork, Claude Code, Manus or Cursor.`),
    },
    {
      q: isEs ? `¿Es seguro usar ${itemName}?` : `Is ${itemName} safe to use?`,
      a: securityStatus === "verified"
        ? (isEs ? `Sí, ${itemName} fue escaneado y verificado por nuestro sistema de seguridad automatizado.` : `Yes, ${itemName} has been scanned and verified by our automated security system.`)
        : (isEs ? `${itemName} fue analizado por nuestro scanner de seguridad. Revisá el panel de seguridad en esta página para ver el trust score y los resultados del escaneo.` : `${itemName} has been analyzed by our security scanner. Check the security panel on this page to see the trust score and scan results.`),
    },
    ...(hasApiKey !== undefined ? [{
      q: isEs ? `¿Necesito una API key?` : `Do I need an API key?`,
      a: hasApiKey
        ? (isEs ? `Sí, este ${typeLabel} requiere credenciales externas. Revisá la sección de credenciales en esta página.` : `Yes, this ${typeLabel} requires external credentials. Check the credentials section on this page.`)
        : (isEs ? `No, no necesitás API key. Solo copiá y usá.` : `No, you don't need an API key. Just copy and use.`),
    }] : []),
    {
      q: isEs ? `¿Con qué agentes AI es compatible?` : `Which AI agents is it compatible with?`,
      a: isEs
        ? `${itemName} es compatible con Claude Code, Claude.ai, Manus, Cursor, Google Antigravity, OpenClaw y cualquier agente que soporte el estándar AgentSkills (SKILL.md).`
        : `${itemName} is compatible with Claude Code, Claude.ai, Manus, Cursor, Google Antigravity, OpenClaw, and any agent that supports the AgentSkills (SKILL.md) standard.`,
    },
    {
      q: isEs ? `¿Es gratis?` : `Is it free?`,
      a: isEs ? `Sí, ${itemName} es completamente gratis para usar.` : `Yes, ${itemName} is completely free to use.`,
    },
  ];

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {isEs ? "Preguntas frecuentes" : "FAQ"}
      </h3>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border">
            <AccordionTrigger className="text-sm text-left py-3 hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
    </div>
  );
}
