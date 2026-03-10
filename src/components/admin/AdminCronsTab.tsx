import { Activity, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "hace " + seconds + "s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return "hace " + minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "hace " + hours + "h";
  return "hace " + Math.floor(hours / 24) + "d";
}

export type CronDef = {
  name: string;
  func: string;
  freq: string;
  pipeline?: { done: number; total: number; label: string };
};

interface AdminCronsTabProps {
  cronList: CronDef[];
  cronStatus: Record<string, { lastRun: string; count24h: number; errors: number; recentLogs: any[] }> | undefined;
  recentLogs: any[] | undefined;
}

export default function AdminCronsTab({ cronList, cronStatus, recentLogs }: AdminCronsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary">
        <Activity className="w-5 h-5 text-emerald-500" />
        <h2 className="font-semibold">Trabajos automatizados</h2>
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
          {cronList.length} activos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cronList.map(cron => {
          const status = cronStatus?.[cron.func];
          const lastRunDate = status ? new Date(status.lastRun) : null;
          const ago = lastRunDate ? getTimeAgo(lastRunDate) : null;
          const hasErrors = status && status.errors > 0;
          const pct = cron.pipeline && cron.pipeline.total > 0
            ? Math.round((cron.pipeline.done / cron.pipeline.total) * 100)
            : null;
          const isComplete = pct !== null && pct >= 100;

          return (
            <div key={cron.name} className="p-4 rounded-2xl bg-secondary space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    hasErrors ? "bg-destructive" : isComplete ? "bg-emerald-500" : "bg-emerald-500 animate-pulse"
                  }`} />
                  <span className="font-medium text-sm">{cron.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-background">{cron.freq}</span>
              </div>

              {cron.pipeline && cron.pipeline.total > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{cron.pipeline.done.toLocaleString()} / {cron.pipeline.total.toLocaleString()}</span>
                    <span className={isComplete ? "text-emerald-500 font-medium" : ""}>{isComplete ? "✓ Completo" : cron.pipeline.label}</span>
                  </div>
                  <Progress value={pct ?? 0} className="h-1.5" />
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{ago ? (<>Último run: <span className="text-foreground font-medium">{ago}</span></>) : "Sin datos aún"}</span>
                {status && (
                  <span className="flex items-center gap-1">
                    <span className="text-foreground font-medium">{status.count24h}</span> ops/24h
                    {hasErrors && <span className="text-destructive ml-1">· {status.errors} err</span>}
                  </span>
                )}
              </div>

              {status && status.recentLogs.length > 0 && (
                <div className="border-t border-border/50 pt-2 space-y-0.5">
                  {status.recentLogs.slice(0, 2).map((log: any, i: number) => (
                    <p key={i} className="text-[10px] text-muted-foreground truncate">
                      <span className="text-foreground/60">{new Date(log.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                      {" "}{log.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-5 rounded-2xl bg-secondary">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Feed de actividad en vivo</h3>
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {(!recentLogs || recentLogs.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente</p>
          ) : (
            recentLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg bg-background/50">
                {log.action_type === "auto_approve" && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                {log.action_type === "auto_reject" && <XCircle className="w-3 h-3 text-destructive shrink-0" />}
                {!["auto_approve", "auto_reject"].includes(log.action_type) && <Activity className="w-3 h-3 text-muted-foreground shrink-0" />}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{log.function_name}</span>
                <span className="flex-1 truncate text-xs">{log.reason}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
