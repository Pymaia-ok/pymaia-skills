import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Award, AlertTriangle, Info, Terminal, Wifi, HardDrive, Clock, UserX, Fingerprint, CalendarClock } from "lucide-react";
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
  createdAt?: string;
  isOfficial?: boolean;
  creatorId?: string | null;
  isStale?: boolean;
  isVerifiedPublisher?: boolean;
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

function getWarnings(scanResult: any, itemType: string, isEs: boolean, createdAt?: string, isOfficial?: boolean, creatorId?: string | null, isStale?: boolean, isVerifiedPublisher?: boolean): Array<{ icon: any; text: string; color: string }> {
  const warnings: Array<{ icon: any; text: string; color: string }> = [];
  
  // ── Stale item warning ──
  if (isStale) {
    warnings.push({
      icon: CalendarClock,
      text: isEs ? "No actualizado en más de 90 días" : "Not updated in over 90 days",
      color: "text-amber-500",
    });
  }

  // ── PRD 7.3: Publisher no verificado (skip if verified publisher) ──
  if (!isOfficial && !creatorId && !isVerifiedPublisher) {
    warnings.push({
      icon: UserX,
      text: isEs ? "Publisher no verificado" : "Unverified publisher",
      color: "text-muted-foreground",
    });
  }

  // ── PRD 7.3: Nuevo < 7 días ──
  if (createdAt) {
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      warnings.push({
        icon: Clock,
        text: isEs ? "Publicado recientemente — menos historial de seguridad" : "Published recently — less security history",
        color: "text-muted-foreground",
      });
    }
  }

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

  // PRD 7.3: Dependency con CVE
  const depVulns = scanResult.layers?.dependencies?.vulnerabilities;
  if (Array.isArray(depVulns) && depVulns.length > 0) {
    const hasCritical = depVulns.some((v: any) => v.severity === "critical" || (v.cvss && v.cvss > 9));
    const hasHigh = depVulns.some((v: any) => v.severity === "high" || (v.cvss && v.cvss > 7));
    if (hasCritical || hasHigh) {
      warnings.push({
        icon: ShieldAlert,
        text: isEs ? "Tiene dependencias con vulnerabilidades conocidas" : "Has dependencies with known vulnerabilities",
        color: "text-destructive",
      });
    } else {
      warnings.push({
        icon: AlertTriangle,
        text: isEs ? "Tiene dependencias con vulnerabilidades conocidas (riesgo medio)" : "Has dependencies with known vulnerabilities (medium risk)",
        color: "text-amber-500",
      });
    }
  }

  return warnings;
}

export const TrustBadge = ({ trustScore, securityStatus, scanResult, size = "md", showScore = true, showWarnings = false, itemType = "skill", createdAt, isOfficial, creatorId }: TrustBadgeProps) => {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const badgeKey = getBadgeFromScore(trustScore);
  const config = BADGE_CONFIG[badgeKey];
  const Icon = config.icon;
  const warnings = showWarnings ? getWarnings(scanResult, itemType, isEs, createdAt, isOfficial, creatorId) : [];

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

// "Scanned by Pymaia" badge (PRD Phase 4)
export const ScannedByPymaiaBadge = ({ size = "sm" }: { size?: "sm" | "md" }) => {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-xs px-2 py-1 gap-1.5";
  const iconSize = size === "sm" ? 10 : 12;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center rounded-full border border-primary/20 bg-primary/5 text-primary font-medium ${sizeClasses}`}>
            <Fingerprint size={iconSize} />
            <span>Scanned by Pymaia</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          Multi-layer security scanning: secrets, injection, scope analysis & more
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Compact version for cards/lists
export const TrustBadgeCompact = ({ trustScore, securityStatus }: { trustScore: number; securityStatus?: string }) => {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";
  
  // Always show something — even for unscanned items
  const badgeKey = trustScore > 0 ? getBadgeFromScore(trustScore) : "new";
  const config = BADGE_CONFIG[badgeKey];
  const Icon = securityStatus === "verified" ? ShieldCheck : securityStatus === "flagged" ? ShieldAlert : config.icon;
  const color = securityStatus === "verified" ? "text-emerald-500" : securityStatus === "flagged" ? "text-destructive" : config.color;
  const bg = securityStatus === "verified" ? "bg-emerald-500/10 border-emerald-500/30" : securityStatus === "flagged" ? "bg-destructive/10 border-destructive/30" : config.bg;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${bg} ${color}`}>
            <Icon size={10} />
            {trustScore > 0 ? (
              <span>{trustScore}</span>
            ) : (
              <span>{securityStatus === "verified" ? "✓" : securityStatus === "flagged" ? "!" : "?"}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[180px]">
          {trustScore > 0 ? (
            `Trust Score: ${trustScore}/100`
          ) : (
            isEs ? "Sin puntaje de confianza aún" : "No trust score yet"
          )}
          {securityStatus && securityStatus !== "unverified" && (
            <span className="block">{isEs ? "Estado" : "Status"}: {securityStatus}</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TrustBadge;
