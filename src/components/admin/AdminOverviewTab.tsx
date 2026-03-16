import { Languages, ShieldCheck, ShieldAlert, Shield, RefreshCw, CheckCircle2, XCircle, Clock, Activity, AlertTriangle, FileWarning, Lightbulb, TrendingDown, Search, Sparkles, Database, Code, Brain, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface QualityInsight {
  id: string;
  created_at: string;
  insight_type: string;
  goal: string;
  details: any;
  action_taken: string | null;
  status: string;
}

interface PipelineHealth {
  embeddings: { done: number; total: number };
  skillMd: number;
  ghMetadata: number;
  usage24h: number;
}

interface AdminOverviewTabProps {
  translatedCount: number;
  translationTotal: number;
  translationPercent: number;
  translationStats: { untranslated: number } | undefined;
  securityPercent: number;
  securityStats: { verified: number; flagged: number; unverified: number } | undefined;
  connectorStats: { total: number; untranslated: number } | undefined;
  recentLogs: any[] | undefined;
  qualityInsights?: QualityInsight[];
  pipelineHealth?: PipelineHealth;
}

const insightIcon: Record<string, typeof Lightbulb> = {
  empty_results: Search,
  low_rating: TrendingDown,
  keyword_gap: AlertTriangle,
  missing_template: Sparkles,
};

const insightColor: Record<string, string> = {
  empty_results: "text-amber-500",
  low_rating: "text-destructive",
  keyword_gap: "text-orange-500",
  missing_template: "text-primary",
};

const insightLabel: Record<string, string> = {
  empty_results: "Sin resultados",
  low_rating: "Baja calificación",
  keyword_gap: "Keyword gap",
  missing_template: "Template sugerido",
};

export default function AdminOverviewTab({
  translatedCount, translationTotal, translationPercent, translationStats,
  securityPercent, securityStats, connectorStats, recentLogs, qualityInsights, pipelineHealth,
}: AdminOverviewTabProps) {
  const pendingInsights = qualityInsights?.filter(i => i.status === "pending") || [];
  const embPct = pipelineHealth ? (pipelineHealth.embeddings.total > 0 ? (pipelineHealth.embeddings.done / pipelineHealth.embeddings.total) * 100 : 0) : 0;

  return (
    <>
      {/* Pipeline Health */}
      {pipelineHealth && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Embeddings</span>
            </div>
            <p className="text-lg font-bold">{pipelineHealth.embeddings.done.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {pipelineHealth.embeddings.total.toLocaleString()}</span></p>
            <Progress value={embPct} className="h-1.5 mt-1" />
            <p className="text-[10px] text-muted-foreground mt-1">{embPct.toFixed(1)}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">SKILL.md</span>
            </div>
            <p className="text-2xl font-bold">{pipelineHealth.skillMd.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">fetched</p>
          </div>
          <div className="p-4 rounded-2xl bg-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">GitHub Metadata</span>
            </div>
            <p className="text-2xl font-bold">{pipelineHealth.ghMetadata.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">repos enriquecidos</p>
          </div>
          <div className="p-4 rounded-2xl bg-secondary">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Usage 24h</span>
            </div>
            <p className="text-2xl font-bold">{pipelineHealth.usage24h.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">eventos MCP Agent</p>
          </div>
        </div>
      )}
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

      {/* Quality Insights */}
      <div className="p-5 rounded-2xl bg-secondary mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold">Calidad del MCP Agent</h2>
          {pendingInsights.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {pendingInsights.length} pendientes
            </Badge>
          )}
        </div>
        {pendingInsights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin insights de calidad pendientes. El monitor corre diariamente.
          </p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {pendingInsights.slice(0, 15).map(insight => {
              const Icon = insightIcon[insight.insight_type] || Lightbulb;
              const color = insightColor[insight.insight_type] || "text-muted-foreground";
              return (
                <div key={insight.id} className="flex items-start gap-3 text-sm py-2 px-3 rounded-lg bg-background/50">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{insight.goal}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {insightLabel[insight.insight_type] || insight.insight_type}
                      </Badge>
                    </div>
                    {insight.action_taken && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{insight.action_taken}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(insight.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
