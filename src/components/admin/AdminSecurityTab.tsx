import { ShieldCheck, ShieldAlert, AlertTriangle, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AdminSecurityTabProps {
  scanPercent: number;
  securityStats: { scanned: number; unscanned: number } | undefined;
  trustDistribution: { avg: number; official: number; verified: number; trusted: number; reviewed: number; new_: number } | undefined;
  openIncidents: any[];
  incidents: any[] | undefined;
  openReports: any[] | undefined;
  p0Count: number;
  p1Count: number;
}

export default function AdminSecurityTab({
  scanPercent, securityStats, trustDistribution,
  openIncidents, incidents, openReports, p0Count, p1Count,
}: AdminSecurityTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-secondary">
          <p className="text-xs text-muted-foreground mb-1">Scan Coverage</p>
          <p className="text-2xl font-bold">{Math.round(scanPercent)}%</p>
          <Progress value={scanPercent} className="h-1.5 mt-2" />
          <p className="text-[10px] text-muted-foreground mt-1">{securityStats?.scanned ?? 0} scanned / {securityStats?.unscanned ?? 0} pending</p>
        </div>
        <div className="p-4 rounded-2xl bg-secondary">
          <p className="text-xs text-muted-foreground mb-1">Trust Score Promedio</p>
          <p className="text-2xl font-bold">{trustDistribution?.avg ?? 0}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Target: &gt;60</p>
        </div>
        <div className="p-4 rounded-2xl bg-secondary">
          <p className="text-xs text-muted-foreground mb-1">Incidentes Abiertos</p>
          <p className={`text-2xl font-bold ${openIncidents.length > 0 ? "text-destructive" : "text-emerald-500"}`}>{openIncidents.length}</p>
          {p0Count > 0 && <p className="text-[10px] text-destructive font-medium">P0: {p0Count} · P1: {p1Count}</p>}
        </div>
        <div className="p-4 rounded-2xl bg-secondary">
          <p className="text-xs text-muted-foreground mb-1">Reportes Abiertos</p>
          <p className={`text-2xl font-bold ${(openReports?.length ?? 0) > 0 ? "text-amber-500" : "text-emerald-500"}`}>{openReports?.length ?? 0}</p>
        </div>
      </div>

      {trustDistribution && (
        <div className="p-5 rounded-2xl bg-secondary">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Eye className="w-4 h-4" /> Distribución Trust Score</h3>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Official 90+", value: trustDistribution.official, color: "bg-amber-500" },
              { label: "Verified 80+", value: trustDistribution.verified, color: "bg-emerald-500" },
              { label: "Trusted 60+", value: trustDistribution.trusted, color: "bg-green-500" },
              { label: "Reviewed 40+", value: trustDistribution.reviewed, color: "bg-blue-500" },
              { label: "New <40", value: trustDistribution.new_, color: "bg-muted-foreground" },
            ].map(b => {
              const total = trustDistribution.official + trustDistribution.verified + trustDistribution.trusted + trustDistribution.reviewed + trustDistribution.new_;
              return (
                <div key={b.label} className="text-center">
                  <div className={`w-full h-2 rounded-full ${b.color} mb-1`} style={{ opacity: Math.max(0.2, b.value / Math.max(1, total)) }} />
                  <p className="text-lg font-bold">{b.value}</p>
                  <p className="text-[10px] text-muted-foreground">{b.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-secondary">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-destructive" /> Incidentes de seguridad</h3>
        {(!incidents || incidents.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin incidentes registrados</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg bg-background/50">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  inc.severity === "P0" ? "bg-destructive text-destructive-foreground" :
                  inc.severity === "P1" ? "bg-destructive/80 text-destructive-foreground" :
                  inc.severity === "P2" ? "bg-amber-500/20 text-amber-600" :
                  "bg-muted text-muted-foreground"
                }`}>{inc.severity}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${inc.status === "open" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>{inc.status}</span>
                <span className="flex-1 truncate">{inc.description}</span>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(inc.created_at).toLocaleDateString("es-AR", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-secondary">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Reportes de abuso abiertos</h3>
        {(!openReports || openReports.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin reportes abiertos ✓</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {openReports.map((rep: any) => (
              <div key={rep.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg bg-background/50">
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">{rep.report_type}</span>
                <span className="text-xs text-muted-foreground">{rep.item_type}</span>
                <span className="flex-1 truncate">{rep.item_slug}: {rep.description}</span>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(rep.created_at).toLocaleDateString("es-AR", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
