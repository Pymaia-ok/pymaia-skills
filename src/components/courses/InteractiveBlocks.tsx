import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { 
  Lightbulb, Copy, Check, ChevronDown, ChevronUp, 
  Play, ExternalLink, Clipboard, Eye, EyeOff,
  Rocket, AlertTriangle, Info, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Try It Block ─── */
export const TryItBlock = ({ title, children }: { title?: string; children: ReactNode }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="my-6 rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
          <Rocket className="w-4 h-4" />
          {title || t("courses.tryItTitle")}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 text-sm text-foreground space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

/* ─── Step by Step ─── */
export const StepBlock = ({ number, title, children }: { number: number; title: string; children: ReactNode }) => {
  return (
    <div className="flex gap-4 my-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
};

/* ─── Pro Tip / Warning / Info Callouts ─── */
type CalloutType = "tip" | "warning" | "info" | "zap";
const calloutConfig: Record<CalloutType, { icon: typeof Lightbulb; colorClass: string; bgClass: string }> = {
  tip: { icon: Lightbulb, colorClass: "text-amber-500", bgClass: "border-amber-500/30 bg-amber-500/5" },
  warning: { icon: AlertTriangle, colorClass: "text-destructive", bgClass: "border-destructive/30 bg-destructive/5" },
  info: { icon: Info, colorClass: "text-blue-500", bgClass: "border-blue-500/30 bg-blue-500/5" },
  zap: { icon: Zap, colorClass: "text-primary", bgClass: "border-primary/30 bg-primary/5" },
};

export const CalloutBlock = ({ type = "tip", title, children }: { type?: CalloutType; title?: string; children: ReactNode }) => {
  const { t } = useTranslation();
  const cfg = calloutConfig[type] || calloutConfig.tip;
  const Icon = cfg.icon;
  const defaultTitles: Record<CalloutType, string> = {
    tip: t("courses.proTip"),
    warning: t("courses.warning"),
    info: t("courses.infoNote"),
    zap: t("courses.quickTip"),
  };

  return (
    <div className={`my-5 rounded-xl border-2 ${cfg.bgClass} px-5 py-4`}>
      <div className={`flex items-center gap-2 text-sm font-bold ${cfg.colorClass} mb-2`}>
        <Icon className="w-4 h-4" />
        {title || defaultTitles[type]}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
};

/* ─── Copyable Code Block ─── */
export const CopyableCode = ({ code, language }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg border border-border bg-muted/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/80">
        <span className="text-xs text-muted-foreground font-mono">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/* ─── Reveal / Spoiler Block ─── */
export const RevealBlock = ({ label, children }: { label?: string; children: ReactNode }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="my-4 rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setVisible(!visible)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors text-left"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {label || t("courses.revealAnswer")}
      </button>
      {visible && (
        <div className="px-4 pb-4 text-sm text-foreground border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
};

/* ─── YouTube Embed ─── */
export const YouTubeEmbed = ({ videoId, title }: { videoId: string; title?: string }) => {
  return (
    <div className="my-6 rounded-xl overflow-hidden border border-border aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title || "Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
};

/* ─── Image with Caption ─── */
export const ImageWithCaption = ({ src, alt, caption }: { src: string; alt?: string; caption?: string }) => {
  return (
    <figure className="my-6">
      <div className="rounded-xl overflow-hidden border border-border">
        <img src={src} alt={alt || caption || ""} className="w-full h-auto" loading="lazy" />
      </div>
      {caption && (
        <figcaption className="text-xs text-muted-foreground text-center mt-2 italic">{caption}</figcaption>
      )}
    </figure>
  );
};
