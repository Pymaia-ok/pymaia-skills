import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Copy, Check } from "lucide-react";
import { useState } from "react";

const INSTALL_CMD = "claude mcp add pymaia-skills --transport http https://mcp.pymaia.com";

const FinalCTA = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative py-28 overflow-hidden bg-foreground text-background">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-background/10 border border-background/10 mb-8">
            <Bot className="w-8 h-8 text-background/80" />
          </div>

          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-background/50 text-lg mb-8 max-w-xl mx-auto">
            {t("landing.ctaSubtitle")}
          </p>

          {/* Install command */}
          <button
            onClick={handleCopy}
            className="w-full max-w-xl mx-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-background text-foreground font-mono text-sm border border-background/20 hover:bg-background/90 transition-colors cursor-pointer group text-left mb-8"
          >
            <span className="text-foreground/50 select-none">$</span>
            <span className="flex-1 truncate">{INSTALL_CMD}</span>
            {copied ? (
              <Check className="w-4 h-4 shrink-0 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 shrink-0 text-foreground/50 group-hover:text-foreground transition-colors" />
            )}
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="secondary" size="lg" className="text-base px-8 h-12 rounded-full">
              <Link to="/conector/pymaia-skills">
                {t("landing.ctaExplore")} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-base px-8 h-12 rounded-full text-background/70 hover:text-background hover:bg-background/10">
              <Link to="/explorar">
                {t("landing.ctaLearn")}
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
