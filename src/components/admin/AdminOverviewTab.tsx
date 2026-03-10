import { Languages, ShieldCheck, ShieldAlert, Shield, RefreshCw, CheckCircle2, XCircle, Clock, Activity, AlertTriangle, FileWarning } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AdminOverviewTabProps {
  translatedCount: number;
  translationTotal: number;
  translationPercent: number;
  translationStats: { untranslated: number } | undefined;
  securityPercent: number;
  securityStats: { verified: number; flagged: number; unverified: number } | undefined;
  connectorStats: { total: number; untranslated: number } | undefined;
  recentLogs: any[] | undefined;
}

export default function AdminOverviewTab({
  translatedCount, translationTotal, translationPercent, translationStats,
  securityPercent, securityStats, connectorStats, recentLogs,
}: AdminOverviewTabProps) {
  return (
    <>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-secondary">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Traducción</h2>
          </div>
          <Progress value={translationPercent} className="h-2 mb-2" />
          <p className="text-sm text-muted-foreground">
            {translatedCount.toLocaleString()} / {translationTotal.toLocaleString()} skills
            {translationStats?.untranslated === 0 && <span className="text-emerald-500 ml-1">✓</span>}
          </p>
          {connectorStats && (
            <p className="text-xs text-muted-foreground mt-1">
              Conectores: {(connectorStats.total - connectorStats.untranslated).toLocaleString()} / {connectorStats.total.toLocaleString()}
            </p>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-secondary">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold">Seguridad</h2>
          </div>
          <Progress value={securityPercent} className="h-2 mb-2" />
          <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-1 text-emerald-500"><ShieldCheck className="w-3 h-3" /> {securityStats?.verified ?? 0}</span>
            <span className="flex items-center gap-1 text-destructive"><ShieldAlert className="w-3 h-3" /> {securityStats?.flagged ?? 0}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Shield className="w-3 h-3" /> {securityStats?.unverified ?? 0}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-secondary">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Sync Conectores</h2>
          </div>
          <p className="text-2xl font-bold">{connectorStats?.total.toLocaleString() ?? "..."}</p>
          <p className="text-xs text-muted-foreground">Smithery 6AM · Official 6:30AM · GitHub 7AM UTC</p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-secondary">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" />
          <h2 className="font-semibold">Actividad reciente</h2>
        </div>
        {(!recentLogs || recentLogs.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Los logs de automatización aparecerán aquí...
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {recentLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg bg-background/50">
                {log.action_type === "auto_approve" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                {log.action_type === "auto_reject" && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                {log.action_type?.startsWith("quality") && <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                {log.action_type === "rug_pull_detected" && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                {log.action_type === "new_flag_on_rescan" && <FileWarning className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                {!["auto_approve", "auto_reject", "rug_pull_detected", "new_flag_on_rescan"].includes(log.action_type) && !log.action_type?.startsWith("quality") && (
                  <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="flex-1 truncate">{log.reason}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(log.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
