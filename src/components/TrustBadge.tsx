import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Award, Star, AlertTriangle, Info, Terminal, Wifi, HardDrive, Clock } from "lucide-react";
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

function getWarnings(scanResult: any, itemType: string, isEs: boolean): Array<{ icon: any; text: string; color: string }> {
  const warnings: Array<{ icon: any; text: string; color: string }> = [];
  
  if (!scanResult) return warnings;
  
  if (scanResult.verdict === "SUSPICIOUS") {
    warnings.push({
      icon: AlertTriangle,
      text: isEs ? "Marcado para revisión — usar con precaución" : "Flagged for review — use with caution",
      color: "text-amber-500",
    });
  }
  
  if (scanResult.verdict === "MALICIOUS") {
    warnings.push({
      icon: ShieldAlert,
      text: isEs ? "Riesgo de seguridad detectado — bloqueado" : "Security risk detected — blocked",
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.secrets?.count > 0) {
    warnings.push({
      icon: AlertTriangle,
      text: isEs ? "Contiene credenciales expuestas" : "Contains exposed credentials",
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.injection?.critical > 0) {
    warnings.push({
      icon: ShieldAlert,
      text: isEs ? "Patrones de prompt injection detectados" : "Prompt injection patterns detected",
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.typosquatting?.flags?.length > 0) {
    warnings.push({
      icon: Info,
      text: isEs ? "Nombre similar a una herramienta popular — verificar autenticidad" : "Name similar to a popular tool — verify authenticity",
      color: "text-amber-500",
    });
  }

  if (scanResult.layers?.hidden_content?.findings?.length > 0) {
    warnings.push({
      icon: ShieldAlert,
      text: isEs ? "Contenido oculto u ofuscado detectado" : "Hidden or obfuscated content detected",
      color: "text-destructive",
    });
  }

  if (scanResult.layers?.scope?.scope_assessment === "excessive") {
    warnings.push({
      icon: AlertTriangle,
      text: isEs ? "Permisos excesivos — revisar con cuidado" : "Excessive permissions — review carefully",
      color: "text-amber-500",
    });
  }

  if (scanResult.layers?.format?.issues?.some((i: any) => i.severity === "error")) {
    warnings.push({
      icon: AlertTriangle,
      text: isEs ? "Problemas en el formato del comando de instalación" : "Install command format concerns",
      color: "text-amber-500",
    });
  }

  // Hook warnings (PRD 7.3)
  if (scanResult.layers?.hooks?.has_hooks) {
    warnings.push({
      icon: Terminal,
      text: isEs ? "Este plugin ejecuta comandos del sistema" : "This plugin executes system commands",
      color: "text-amber-500",
    });
    if (scanResult.layers.hooks.blocked_count > 0) {
      warnings.push({
        icon: ShieldAlert,
        text: isEs ? "Hooks peligrosos bloqueados" : "Dangerous hooks blocked",
        color: "text-destructive",
      });
    }
  }

  // MCP filesystem access warning (PRD 7.3)
  const scopePerms = scanResult.layers?.scope?.permissions;
  if (scopePerms && Array.isArray(scopePerms)) {
    const hasFs = scopePerms.some((p: any) => p.category === "write_fs" || p.category === "read_fs");
    const hasNet = scopePerms.some((p: any) => p.category === "network");
    const hasExec = scopePerms.some((p: any) => p.category === "exec");

    if (hasFs && (itemType === "connector" || itemType === "plugin")) {
      warnings.push({
        icon: HardDrive,
        text: isEs ? "Este conector accede a tus archivos" : "This connector accesses your files",
        color: "text-amber-500",
      });
    }
    if (hasNet && (itemType === "connector" || itemType === "plugin")) {
      warnings.push({
        icon: Wifi,
        text: isEs ? "Este conector se conecta a servicios externos" : "This connector connects to external services",
        color: "text-amber-500",
      });
    }
    if (hasExec) {
      warnings.push({
        icon: Terminal,
        text: isEs ? "Puede ejecutar comandos del sistema" : "Can execute system commands",
        color: "text-destructive",
      });
    }
  }

  // Publisher not verified warning
  // New item warning (< 7 days) — handled via createdAt if provided

  return warnings;
}

export const TrustBadge = ({ trustScore, securityStatus, scanResult, size = "md", showScore = true, showWarnings = false, itemType = "skill" }: TrustBadgeProps) => {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const badgeKey = getBadgeFromScore(trustScore);
  const config = BADGE_CONFIG[badgeKey];
  const Icon = config.icon;
  const warnings = showWarnings ? getWarnings(scanResult, itemType, isEs) : [];

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
