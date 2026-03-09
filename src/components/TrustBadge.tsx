import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Award, Star, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface TrustBadgeProps {
  trustScore: number;
  securityStatus?: string;
  scanResult?: any;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showWarnings?: boolean;
  itemType?: "skill" | "connector" | "plugin";
}

const BADGE_CONFIG: Record<string, { label: string; labelEs: string; color: string; icon: any; bg: string }> = {
  official: { label: "Official", labelEs: "Oficial", color: "text-amber-500", icon: Award, bg: "bg-amber-500/10 border-amber-500/30" },
  verified: { label: "Verified", labelEs: "Verificado", color: "text-emerald-500", icon: ShieldCheck, bg: "bg-emerald-500/10 border-emerald-500/30" },
  trusted: { label: "Trusted", labelEs: "Confiable", color: "text-green-500", icon: ShieldCheck, bg: "bg-green-500/10 border-green-500/30" },
  reviewed: { label: "Reviewed", labelEs: "Revisado", color: "text-blue-500", icon: Shield, bg: "bg-blue-500/10 border-blue-500/30" },
  new: { label: "New", labelEs: "Nuevo", color: "text-muted-foreground", icon: ShieldQuestion, bg: "bg-muted/50 border-border" },
};

function getBadgeFromScore(score: number): string {
  if (score >= 90) return "official";
  if (score >= 80) return "verified";
  if (score >= 60) return "trusted";
  if (score >= 40) return "reviewed";
  return "new";
}

function getWarnings(scanResult: any, itemType: string, t: any): Array<{ icon: any; text: string; color: string }> {
  const warnings: Array<{ icon: any; text: string; color: string }> = [];
  
  if (!scanResult) return warnings;
  
  if (scanResult.verdict === "SUSPICIOUS") {
    warnings.push({
      icon: AlertTriangle,
      text: t("security.suspicious", "Flagged for review — use with caution"),
      color: "text-amber-500",
    });
  }
  
  if (scanResult.verdict === "MALICIOUS") {
    warnings.push({
      icon: ShieldAlert,
      text: t("security.malicious", "Security risk detected — blocked"),
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.secrets?.count > 0) {
    warnings.push({
      icon: AlertTriangle,
      text: t("security.secrets_detected", "Contains exposed credentials"),
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.injection?.critical > 0) {
    warnings.push({
      icon: ShieldAlert,
      text: t("security.injection_detected", "Prompt injection patterns detected"),
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.typosquatting?.flags?.length > 0) {
    warnings.push({
      icon: Info,
      text: t("security.typosquatting", "Name similar to a popular tool — verify authenticity"),
      color: "text-amber-500",
    });
  }

  if (scanResult.layers?.hidden_content?.findings?.length > 0) {
    warnings.push({
      icon: ShieldAlert,
      text: t("security.hidden_content", "Hidden or obfuscated content detected"),
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.scope?.scope_assessment === "excessive") {
    warnings.push({
      icon: AlertTriangle,
      text: t("security.excessive_scope", "Excessive permissions — review carefully"),
      color: "text-amber-500",
    });
  }

  if (scanResult.layers?.format?.issues?.some((i: any) => i.severity === "error")) {
    warnings.push({
      icon: AlertTriangle,
      text: t("security.format_issues", "Install command format concerns"),
      color: "text-amber-500",
    });
  }

  return warnings;
}

export const TrustBadge = ({ trustScore, securityStatus, scanResult, size = "md", showScore = true, showWarnings = false, itemType = "skill" }: TrustBadgeProps) => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const badgeKey = getBadgeFromScore(trustScore);
  const config = BADGE_CONFIG[badgeKey];
  const Icon = config.icon;
  const warnings = showWarnings ? getWarnings(scanResult, itemType, t) : [];

  const sizeClasses = {
    sm: "text-xs gap-1 px-1.5 py-0.5",
    md: "text-sm gap-1.5 px-2.5 py-1",
    lg: "text-base gap-2 px-3 py-1.5",
  };
  const iconSize = size === "sm" ? 12 : size === "md" ? 14 : 16;

  return (
    <div className="flex flex-col gap-1.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${config.color} ${sizeClasses[size]}`}>
              <Icon size={iconSize} />
              <span>{isEs ? config.labelEs : config.label}</span>
              {showScore && trustScore > 0 && (
                <span className="opacity-70 text-[0.85em]">{trustScore}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Trust Score: {trustScore}/100</p>
              <p className="text-xs text-muted-foreground">
                {isEs 
                  ? "Basado en seguridad, publisher, comunidad y antigüedad" 
                  : "Based on security, publisher, community & longevity"}
              </p>
              {securityStatus && (
                <p className="text-xs">
                  {isEs ? "Estado de seguridad" : "Security status"}: {securityStatus}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs ${w.color}`}>
              <w.icon size={12} />
              <span>{w.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Compact version for cards/lists
export const TrustBadgeCompact = ({ trustScore, securityStatus }: { trustScore: number; securityStatus?: string }) => {
  const badgeKey = getBadgeFromScore(trustScore);
  const config = BADGE_CONFIG[badgeKey];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}>
            <Icon size={10} />
            {trustScore > 0 && <span>{trustScore}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Trust Score: {trustScore}/100
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TrustBadge;
