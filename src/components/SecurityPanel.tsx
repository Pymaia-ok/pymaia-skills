import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle, Clock, UserX, Activity, Fingerprint, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { TrustBadgeCompact } from "@/components/TrustBadge";

interface SecurityPanelProps {
  trustScore: number;
  securityStatus: string;
  securityScannedAt?: string | null;
  scanResult?: any;
  createdAt?: string;
  isOfficial?: boolean;
  creatorId?: string | null;
  creatorName?: string | null;
  creatorUsername?: string | null;
  creatorAvatarUrl?: string | null;
  lastCommitAt?: string | null;
  itemType: "skill" | "connector" | "plugin";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-green-500/10 border-green-500/20";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/20";
  return "bg-muted/50 border-border";
}

function getStatusIcon(status: string) {
  switch (status) {
    case "verified": return ShieldCheck;
    case "flagged": return ShieldAlert;
    case "suspicious": return ShieldAlert;
    default: return ShieldQuestion;
  }
}

export const SecurityPanel = ({
  trustScore,
  securityStatus,
  securityScannedAt,
  scanResult,
  createdAt,
  isOfficial,
  creatorId,
  creatorName,
  creatorUsername,
  creatorAvatarUrl,
  lastCommitAt,
  itemType,
}: SecurityPanelProps) => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const ageDays = createdAt ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) : null;
  const commitMonths = lastCommitAt ? (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24 * 30) : null;
  const isActive = commitMonths !== null && commitMonths <= 6;
  const isNew = ageDays !== null && ageDays < 7;

  const statusLabels: Record<string, { en: string; es: string }> = {
    verified: { en: "Verified", es: "Verificado" },
    flagged: { en: "Flagged", es: "Marcado" },
    suspicious: { en: "Suspicious", es: "Sospechoso" },
    unverified: { en: "Unverified", es: "Sin verificar" },
    pending: { en: "Pending", es: "Pendiente" },
  };

  const statusLabel = statusLabels[securityStatus] || statusLabels.unverified;

  // Count warnings from scan result
  const warningCount = scanResult ? [
    scanResult.layers?.secrets?.count > 0,
    scanResult.layers?.injection?.critical > 0,
    scanResult.layers?.hidden_content?.findings?.length > 0,
    scanResult.layers?.typosquatting?.flags?.length > 0,
    scanResult.layers?.scope?.scope_assessment === "excessive",
    scanResult.layers?.dependencies?.vulnerabilities?.length > 0,
  ].filter(Boolean).length : 0;

  // Derive a display score: use trustScore if available, else derive from scan
  const hasBeenScanned = !!securityScannedAt;
  const hasTrustScore = trustScore > 0;
  
  // If scanned but no trust score yet, derive a basic one from scan result
  const derivedScore = (() => {
    if (hasTrustScore) return trustScore;
    if (!hasBeenScanned || !scanResult) return 0;
    // Simple derivation: start at 70, subtract per warning
    let score = 70;
    score -= warningCount * 15;
    if (isOfficial) score += 15;
    if (isActive) score += 10;
    if (!creatorId && !isOfficial) score -= 10;
    return Math.max(0, Math.min(100, score));
  })();

  const displayScore = derivedScore;
  const scoreIsEstimated = !hasTrustScore && hasBeenScanned && displayScore > 0;

  // Derive effective status from scan when status is still "unverified" but scanned
  const effectiveStatus = (() => {
    if (securityStatus !== "unverified") return securityStatus;
    if (!hasBeenScanned) return "unverified";
    if (warningCount > 0) return "flagged";
    return "verified";
  })();

  const StatusIcon = getStatusIcon(effectiveStatus);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          {isEs ? "Seguridad y confianza" : "Security & Trust"}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Trust Score */}
        <div className={`rounded-xl border p-4 ${getScoreBg(displayScore)}`}>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Trust Score{scoreIsEstimated ? (isEs ? " (estimado)" : " (estimated)") : ""}
          </p>
          <p className={`text-2xl font-bold ${getScoreColor(displayScore)}`}>
            {displayScore > 0 ? `${displayScore}/100` : "—"}
          </p>
        </div>

        {/* Security Status */}
        <div className={`rounded-xl border p-4 ${
          effectiveStatus === "verified" ? "bg-emerald-500/10 border-emerald-500/20" :
          effectiveStatus === "flagged" || effectiveStatus === "suspicious" ? "bg-destructive/10 border-destructive/20" :
          "bg-muted/50 border-border"
        }`}>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {isEs ? "Estado" : "Status"}
          </p>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-5 h-5 ${
              effectiveStatus === "verified" ? "text-emerald-500" :
              effectiveStatus === "flagged" || effectiveStatus === "suspicious" ? "text-destructive" :
              "text-muted-foreground"
            }`} />
            <span className={`text-sm font-semibold ${
              effectiveStatus === "verified" ? "text-emerald-600 dark:text-emerald-400" :
              effectiveStatus === "flagged" || effectiveStatus === "suspicious" ? "text-destructive" :
              "text-muted-foreground"
            }`}>
              {isEs ? (statusLabels[effectiveStatus] || statusLabels.unverified).es : (statusLabels[effectiveStatus] || statusLabels.unverified).en}
            </span>
          </div>
        </div>
      </div>

      {/* Scan details when available */}
      {hasBeenScanned && scanResult?.layers && (
        <div className="mb-5 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            {isEs ? "Resultado del análisis" : "Scan Results"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "secrets", label: isEs ? "Secretos expuestos" : "Exposed secrets", ok: !scanResult.layers?.secrets?.count },
              { key: "injection", label: isEs ? "Inyección de código" : "Code injection", ok: !scanResult.layers?.injection?.critical },
              { key: "hidden_content", label: isEs ? "Contenido oculto" : "Hidden content", ok: !scanResult.layers?.hidden_content?.findings?.length },
              { key: "typosquatting", label: "Typosquatting", ok: !scanResult.layers?.typosquatting?.flags?.length },
              { key: "scope", label: isEs ? "Permisos" : "Permissions", ok: scanResult.layers?.scope?.scope_assessment !== "excessive" },
              { key: "license", label: isEs ? "Licencia" : "License", ok: !!scanResult.layers?.license?.license },
              { key: "description_accuracy", label: isEs ? "Precisión descripción" : "Description accuracy", ok: !scanResult.layers?.description_accuracy?.mismatches?.length },
              { key: "frontmatter", label: isEs ? "Cumplimiento formato" : "Format compliance", ok: !scanResult.layers?.frontmatter?.issues?.length },
            ].map((check) => (
              <div key={check.key} className="flex items-center gap-1.5 text-xs">
                {check.ok ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <span className={check.ok ? "text-muted-foreground" : "text-destructive font-medium"}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan info */}
      <div className="space-y-3 mb-5">
        {securityScannedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Fingerprint className="w-3.5 h-3.5 text-primary" />
            <span>
              {isEs ? "Escaneado por Pymaia" : "Scanned by Pymaia"}{" "}
              {new Date(securityScannedAt).toLocaleDateString(isEs ? "es" : "en", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
        )}

        {!securityScannedAt && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isEs ? "Aún no escaneado" : "Not yet scanned"}</span>
          </div>
        )}

        {isActive && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
            <span>{isEs ? "Mantenido activamente" : "Actively maintained"}</span>
          </div>
        )}

        {commitMonths !== null && !isActive && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{isEs ? "Sin actividad reciente" : "No recent activity"}</span>
          </div>
        )}

        {isNew && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{isEs ? "Publicado recientemente" : "Published recently"}</span>
          </div>
        )}

        {!creatorId && !isOfficial && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <UserX className="w-3.5 h-3.5" />
            <span>{isEs ? "Publisher no verificado" : "Unverified publisher"}</span>
          </div>
        )}

        {warningCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{warningCount} {isEs ? "alertas de seguridad" : "security alerts"}</span>
          </div>
        )}
      </div>

      {/* Publisher info */}
      {(creatorName || creatorUsername || isOfficial) && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {isEs ? "Publicado por" : "Published by"}
          </p>
          {creatorUsername ? (
            <Link
              to={`/u/${creatorUsername}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {creatorAvatarUrl ? (
                <img src={creatorAvatarUrl} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {(creatorName || creatorUsername || "?")[0]?.toUpperCase()}
                </div>
              )}
              <span>{creatorName || creatorUsername}</span>
            </Link>
          ) : isOfficial ? (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>{isEs ? "Fuente oficial" : "Official source"}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <UserX className="w-4 h-4" />
              <span>{isEs ? "Autor desconocido" : "Unknown author"}</span>
            </div>
          )}
        </div>
      )}

      {/* Links to security pages */}
      <div className="pt-4 mt-4 border-t border-border flex flex-col gap-2">
        <Link
          to="/security-methodology"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {isEs ? "Cómo escaneamos" : "How we scan"}
        </Link>
        <Link
          to="/seguridad"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {isEs ? "Ver avisos de seguridad" : "View security advisories"}
        </Link>
      </div>
    </div>
  );
};

export default SecurityPanel;
