import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { checkIsAdmin } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, Languages, RefreshCw, ShieldCheck, ShieldAlert, Shield,
  CheckCircle2, XCircle, Clock, TrendingUp, Zap, Database,
  AlertTriangle, FileWarning, Eye, ListChecks, ThumbsUp, ThumbsDown, RotateCw
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Admin = () => {
  const { user, loading } = useAuth();

  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkIsAdmin(user!.id),
    enabled: !!user?.id,
  });

  // ── Metrics ──
  const { data: skillStats } = useQuery({
    queryKey: ["admin-skill-stats"],
    queryFn: async () => {
      const [approved, pending, rejected, total_installs] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("skills").select("install_count").eq("status", "approved"),
      ]);
      const installs = (total_installs.data || []).reduce((s, r) => s + (r.install_count || 0), 0);
      return { approved: approved.count ?? 0, pending: pending.count ?? 0, rejected: rejected.count ?? 0, installs };
    },
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });

  const { data: translationStats } = useQuery({
    queryKey: ["translation-stats"],
    queryFn: async () => {
      const { count: untranslated } = await supabase
        .from("skills").select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .or("display_name_es.is.null,tagline_es.is.null,description_human_es.is.null");
      const { count: total } = await supabase
        .from("skills").select("id", { count: "exact", head: true }).eq("status", "approved");
      return { untranslated: untranslated ?? 0, total: total ?? 0 };
    },
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });

  const { data: connectorStats } = useQuery({
    queryKey: ["connector-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("mcp_servers").select("id", { count: "exact", head: true });
      const { count: untranslated } = await supabase
        .from("mcp_servers").select("id", { count: "exact", head: true })
        .eq("status", "approved").is("description_es", null);
      return { total: count ?? 0, untranslated: untranslated ?? 0 };
    },
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });

  const { data: securityStats } = useQuery({
    queryKey: ["security-stats"],
    queryFn: async () => {
      const [verified, flagged, unverified, scanned, unscanned] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").eq("security_status", "verified"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").eq("security_status", "flagged"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").eq("security_status", "unverified"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").not("security_scanned_at", "is", null),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").is("security_scanned_at", null),
      ]);
      return {
        verified: verified.count ?? 0, flagged: flagged.count ?? 0, unverified: unverified.count ?? 0,
        scanned: scanned.count ?? 0, unscanned: unscanned.count ?? 0,
      };
    },
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });

  // Security incidents
  const { data: incidents } = useQuery({
    queryKey: ["security-incidents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });

  // Security reports
  const { data: openReports } = useQuery({
    queryKey: ["open-security-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_reports")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });

  // Review queue: items flagged or with SUSPICIOUS verdict
  const { data: reviewQueue } = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const items: any[] = [];
      const tables = [
        { name: "skills" as const, type: "skill" },
        { name: "plugins" as const, type: "plugin" },
        { name: "mcp_servers" as const, type: "connector" },
      ];
      for (const t of tables) {
        const nameField = t.name === "skills" ? "display_name" : "name";
        const { data } = await supabase
          .from(t.name)
          .select(`id, slug, ${nameField}, security_status, security_scan_result, security_scanned_at, status`)
          .or("security_status.eq.flagged,security_status.eq.unverified")
          .eq("status", "approved")
          .not("security_scan_result", "is", null)
          .order("security_scanned_at", { ascending: false })
          .limit(30);
        if (data) {
          items.push(...data.map((d: any) => ({
            ...d,
            item_type: t.type,
            name: d[nameField] || d.slug,
            verdict: d.security_scan_result?.verdict || "UNKNOWN",
          })));
        }
      }
      // Sort: SUSPICIOUS/MALICIOUS first
      return items.sort((a, b) => {
        const order: Record<string, number> = { MALICIOUS: 0, SUSPICIOUS: 1, SAFE: 2, UNKNOWN: 3 };
        return (order[a.verdict] ?? 3) - (order[b.verdict] ?? 3);
      });
    },
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });

  const queryClient = useQueryClient();

  const reviewAction = useMutation({
    mutationFn: async ({ id, itemType, action }: { id: string; itemType: string; action: "approve" | "reject" | "rescan" }) => {
      const tableName = itemType === "connector" ? "mcp_servers" : itemType === "plugin" ? "plugins" : "skills";
      if (action === "approve") {
        await supabase.from(tableName).update({ security_status: "verified" }).eq("id", id);
      } else if (action === "reject") {
        await supabase.from(tableName).update({ status: "rejected", security_status: "flagged" }).eq("id", id);
      } else if (action === "rescan") {
        await supabase.functions.invoke("scan-security", { body: { item_id: id, item_type: itemType } });
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`Item ${vars.action === "approve" ? "aprobado" : vars.action === "reject" ? "rechazado" : "re-escaneando"}`)
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
    },
  });

  // Trust score distribution
  const { data: trustDistribution } = useQuery({
    queryKey: ["trust-distribution"],
    queryFn: async () => {
      const { data } = await supabase.from("skills").select("trust_score").eq("status", "approved");
      if (!data) return { official: 0, verified: 0, trusted: 0, reviewed: 0, new_: 0, avg: 0 };
      let official = 0, verified = 0, trusted = 0, reviewed = 0, new_ = 0, sum = 0;
      for (const s of data) {
        const score = s.trust_score ?? 0;
        sum += score;
        if (score >= 90) official++;
        else if (score >= 80) verified++;
        else if (score >= 60) trusted++;
        else if (score >= 40) reviewed++;
        else new_++;
      }
      return { official, verified, trusted, reviewed, new_, avg: data.length ? Math.round(sum / data.length) : 0 };
    },
    enabled: !!isAdmin,
    refetchInterval: 60000,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["automation-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });

  if (loading || checkingAdmin) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="section-title mb-4">Acceso denegado</h1>
          <p className="text-muted-foreground">No tenés permisos de administrador.</p>
        </div>
      </div>
    );
  }

  const translatedCount = translationStats ? translationStats.total - translationStats.untranslated : 0;
  const translationTotal = translationStats?.total ?? 0;
  const translationPercent = translationTotal > 0 ? (translatedCount / translationTotal) * 100 : 0;
  const securityTotal = (securityStats?.verified ?? 0) + (securityStats?.flagged ?? 0) + (securityStats?.unverified ?? 0);
  const securityPercent = securityTotal > 0 ? ((securityStats?.verified ?? 0) / securityTotal) * 100 : 0;
  const scanPercent = (securityStats?.scanned ?? 0) + (securityStats?.unscanned ?? 0) > 0
    ? ((securityStats?.scanned ?? 0) / ((securityStats?.scanned ?? 0) + (securityStats?.unscanned ?? 0))) * 100 : 0;

  const openIncidents = (incidents || []).filter((i: any) => i.status === "open");
  const p0Count = openIncidents.filter((i: any) => i.severity === "P0").length;
  const p1Count = openIncidents.filter((i: any) => i.severity === "P1").length;

  // Live cron status from automation_logs
  const { data: cronStatus } = useQuery({
    queryKey: ["cron-live-status"],
    queryFn: async () => {
      // Get last 200 logs to derive per-function stats
      const { data: logs } = await supabase
        .from("automation_logs")
        .select("function_name, action_type, reason, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!logs) return {};

      const byFunc: Record<string, { lastRun: string; count24h: number; lastAction: string; lastReason: string; errors: number; recentLogs: typeof logs }> = {};
      const now = Date.now();
      const h24 = 24 * 60 * 60 * 1000;

      for (const log of logs) {
        const fn = log.function_name;
        if (!byFunc[fn]) {
          byFunc[fn] = { lastRun: log.created_at, count24h: 0, lastAction: log.action_type, lastReason: log.reason, errors: 0, recentLogs: [] };
        }
        if (now - new Date(log.created_at).getTime() < h24) {
          byFunc[fn].count24h++;
        }
        if (log.action_type?.includes("error") || log.action_type?.includes("fail")) {
          byFunc[fn].errors++;
        }
        if (byFunc[fn].recentLogs.length < 5) {
          byFunc[fn].recentLogs.push(log);
        }
      }
      return byFunc;
    },
    enabled: !!isAdmin,
    refetchInterval: 10000, // every 10s
  });

  // Progress stats for specific pipelines
  const { data: pipelineProgress } = useQuery({
    queryKey: ["pipeline-progress"],
    queryFn: async () => {
      const [
        totalApproved,
        untranslatedSkills,
        untranslatedConnectors,
        totalConnectors,
        unscannedSecurity,
        scannedSecurity,
        pendingSkills,
        enrichPending,
        totalPlugins,
        untranslatedPlugins,
      ] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").or("display_name_es.is.null,tagline_es.is.null,description_human_es.is.null"),
        supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved").is("description_es", null),
        supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").is("security_scanned_at", null),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").not("security_scanned_at", "is", null),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").is("readme_summary", null).not("github_url", "is", null),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved").is("description_es", null),
      ]);
      return {
        skills: { total: totalApproved.count ?? 0, untranslated: untranslatedSkills.count ?? 0 },
        connectors: { total: totalConnectors.count ?? 0, untranslated: untranslatedConnectors.count ?? 0 },
        plugins: { total: totalPlugins.count ?? 0, untranslated: untranslatedPlugins.count ?? 0 },
        security: { scanned: scannedSecurity.count ?? 0, unscanned: unscannedSecurity.count ?? 0 },
        pending: pendingSkills.count ?? 0,
        enrichPending: enrichPending.count ?? 0,
      };
    },
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });

  type CronDef = {
    name: string;
    func: string;
    freq: string;
    pipeline?: { done: number; total: number; label: string };
  };

  const CRON_LIST: CronDef[] = [
    { name: "Auto-approve skills", func: "auto-approve-skills", freq: "Cada 3 min",
      pipeline: pipelineProgress ? { done: (pipelineProgress.skills.total), total: (pipelineProgress.skills.total + pipelineProgress.pending), label: `${pipelineProgress.pending} pendientes` } : undefined },
    { name: "Quality maintenance", func: "quality-maintenance", freq: "Cada 10 min" },
    { name: "Traducir skills", func: "translate-skills", freq: "Cada 1 min",
      pipeline: pipelineProgress ? { done: pipelineProgress.skills.total - pipelineProgress.skills.untranslated, total: pipelineProgress.skills.total, label: `${pipelineProgress.skills.untranslated} faltan` } : undefined },
    { name: "Traducir conectores", func: "translate-connectors", freq: "Cada 2 min",
      pipeline: pipelineProgress ? { done: pipelineProgress.connectors.total - pipelineProgress.connectors.untranslated, total: pipelineProgress.connectors.total, label: `${pipelineProgress.connectors.untranslated} faltan` } : undefined },
    { name: "Traducir plugins", func: "translate-plugins", freq: "Cada 3 min",
      pipeline: pipelineProgress ? { done: pipelineProgress.plugins.total - pipelineProgress.plugins.untranslated, total: pipelineProgress.plugins.total, label: `${pipelineProgress.plugins.untranslated} faltan` } : undefined },
    { name: "Sync estrellas skills", func: "sync-skill-stars", freq: "Cada 1 min" },
    { name: "Sync estrellas conectores", func: "sync-connector-stars", freq: "Cada 2 min" },
    { name: "Verificar seguridad", func: "verify-security", freq: "Cada 2 min" },
    { name: "Security scan", func: "scan-security", freq: "Cada 5 min",
      pipeline: pipelineProgress ? { done: pipelineProgress.security.scanned, total: pipelineProgress.security.scanned + pipelineProgress.security.unscanned, label: `${pipelineProgress.security.unscanned} sin escanear` } : undefined },
    { name: "Trust score calc", func: "calculate-trust-score", freq: "Cada 10 min" },
    { name: "Enriquecer skills IA", func: "enrich-skills-ai", freq: "Cada 3 min",
      pipeline: pipelineProgress ? { done: pipelineProgress.skills.total - pipelineProgress.enrichPending, total: pipelineProgress.skills.total, label: `${pipelineProgress.enrichPending} faltan` } : undefined },
    { name: "Fetch READMEs", func: "fetch-readme", freq: "Cada 3 min" },
    { name: "Version monitor", func: "version-monitor", freq: "Cada 6 horas" },
    { name: "Incident escalation", func: "security-incident", freq: "Cada 15 min" },
    { name: "Re-scan rotación", func: "rescan-security", freq: "Lunes 3:00 UTC" },
    { name: "MCP health check", func: "check-mcp-health", freq: "Cada 12 horas" },
    { name: "Sync skills diario", func: "sync-skills", freq: "Diario 6:00 UTC" },
    { name: "Sync plugins", func: "sync-plugins", freq: "Diario 6:00 UTC" },
    { name: "Sync conectores", func: "sync-connectors", freq: "Diario 6:00 UTC" },
    { name: "Discover trending", func: "discover-trending-skills", freq: "Lunes 6:00 UTC" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14 max-w-6xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panel de Control</h1>
              <p className="text-sm text-muted-foreground">Todo automatizado · Actualización en tiempo real</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {[
              { label: "Aprobadas", value: skillStats?.approved ?? "...", icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Pendientes", value: skillStats?.pending ?? "...", icon: Clock, color: "text-amber-500" },
              { label: "Rechazadas", value: skillStats?.rejected ?? "...", icon: XCircle, color: "text-destructive" },
              { label: "Instalaciones", value: (skillStats?.installs ?? 0).toLocaleString(), icon: TrendingUp, color: "text-primary" },
              { label: "Conectores", value: connectorStats?.total ?? "...", icon: Database, color: "text-primary" },
            ].map(m => (
              <div key={m.label} className="p-4 rounded-2xl bg-secondary">
                <div className="flex items-center gap-2 mb-1">
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                  <p className="text-2xl font-bold">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="overview" className="mb-8">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">General</TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Seguridad
                {p0Count + p1Count > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {p0Count + p1Count}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5" />
                Review Queue
                {(reviewQueue?.length ?? 0) > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {reviewQueue?.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="crons">Automatización</TabsTrigger>
            </TabsList>

            {/* ── OVERVIEW TAB ── */}
            <TabsContent value="overview">
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
                    <span className="flex items-center gap-1 text-emerald-500">
                      <ShieldCheck className="w-3 h-3" /> {securityStats?.verified ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <ShieldAlert className="w-3 h-3" /> {securityStats?.flagged ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Shield className="w-3 h-3" /> {securityStats?.unverified ?? 0}
                    </span>
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

              {/* Recent Automation Logs */}
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
            </TabsContent>

            {/* ── SECURITY TAB ── */}
            <TabsContent value="security">
              <div className="space-y-6">
                {/* Security Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-secondary">
                    <p className="text-xs text-muted-foreground mb-1">Scan Coverage</p>
                    <p className="text-2xl font-bold">{Math.round(scanPercent)}%</p>
                    <Progress value={scanPercent} className="h-1.5 mt-2" />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {securityStats?.scanned ?? 0} scanned / {securityStats?.unscanned ?? 0} pending
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary">
                    <p className="text-xs text-muted-foreground mb-1">Trust Score Promedio</p>
                    <p className="text-2xl font-bold">{trustDistribution?.avg ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Target: &gt;60</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary">
                    <p className="text-xs text-muted-foreground mb-1">Incidentes Abiertos</p>
                    <p className={`text-2xl font-bold ${openIncidents.length > 0 ? "text-destructive" : "text-emerald-500"}`}>
                      {openIncidents.length}
                    </p>
                    {p0Count > 0 && <p className="text-[10px] text-destructive font-medium">P0: {p0Count} · P1: {p1Count}</p>}
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary">
                    <p className="text-xs text-muted-foreground mb-1">Reportes Abiertos</p>
                    <p className={`text-2xl font-bold ${(openReports?.length ?? 0) > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                      {openReports?.length ?? 0}
                    </p>
                  </div>
                </div>

                {/* Trust Score Distribution */}
                {trustDistribution && (
                  <div className="p-5 rounded-2xl bg-secondary">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Distribución Trust Score
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "Official 90+", value: trustDistribution.official, color: "bg-amber-500" },
                        { label: "Verified 80+", value: trustDistribution.verified, color: "bg-emerald-500" },
                        { label: "Trusted 60+", value: trustDistribution.trusted, color: "bg-green-500" },
                        { label: "Reviewed 40+", value: trustDistribution.reviewed, color: "bg-blue-500" },
                        { label: "New <40", value: trustDistribution.new_, color: "bg-muted-foreground" },
                      ].map(b => (
                        <div key={b.label} className="text-center">
                          <div className={`w-full h-2 rounded-full ${b.color} mb-1`} style={{ opacity: Math.max(0.2, b.value / Math.max(1, trustDistribution.official + trustDistribution.verified + trustDistribution.trusted + trustDistribution.reviewed + trustDistribution.new_)) }} />
                          <p className="text-lg font-bold">{b.value}</p>
                          <p className="text-[10px] text-muted-foreground">{b.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Incidents */}
                <div className="p-5 rounded-2xl bg-secondary">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-destructive" /> Incidentes de seguridad
                  </h3>
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
                          <span className={`text-xs px-1.5 py-0.5 rounded ${inc.status === "open" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                            {inc.status}
                          </span>
                          <span className="flex-1 truncate">{inc.description}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(inc.created_at).toLocaleDateString("es-AR", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Open Reports */}
                <div className="p-5 rounded-2xl bg-secondary">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Reportes de abuso abiertos
                  </h3>
                  {(!openReports || openReports.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin reportes abiertos ✓</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {openReports.map((rep: any) => (
                        <div key={rep.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg bg-background/50">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">{rep.report_type}</span>
                          <span className="text-xs text-muted-foreground">{rep.item_type}</span>
                          <span className="flex-1 truncate">{rep.item_slug}: {rep.description}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(rep.created_at).toLocaleDateString("es-AR", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── REVIEW QUEUE TAB ── */}
            <TabsContent value="review">
              <div className="p-5 rounded-2xl bg-secondary">
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold">Review Queue — Items pendientes de revisión</h2>
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                    {reviewQueue?.length ?? 0} items
                  </span>
                </div>
                {(!reviewQueue || reviewQueue.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    ✓ No hay items pendientes de revisión
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {reviewQueue.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm py-3 px-4 rounded-lg bg-background/50">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.verdict === "MALICIOUS" ? "bg-destructive text-destructive-foreground" :
                          item.verdict === "SUSPICIOUS" ? "bg-amber-500/20 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        }`}>{item.verdict}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{item.item_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                        </div>
                        {item.security_scan_result?.layers?.dependencies?.vulnerabilities?.length > 0 && (
                          <span className="text-xs text-destructive font-medium">
                            {item.security_scan_result.layers.dependencies.vulnerabilities.length} CVEs
                          </span>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => reviewAction.mutate({ id: item.id, itemType: item.item_type, action: "approve" })}
                            title="Aprobar"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => reviewAction.mutate({ id: item.id, itemType: item.item_type, action: "reject" })}
                            title="Rechazar"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted"
                            onClick={() => reviewAction.mutate({ id: item.id, itemType: item.item_type, action: "rescan" })}
                            title="Re-escanear"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── CRONS TAB ── */}
            <TabsContent value="crons">
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <h2 className="font-semibold">Trabajos automatizados</h2>
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                    {CRON_LIST.length} activos
                  </span>
                </div>

                {/* Cron cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CRON_LIST.map(cron => {
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
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              hasErrors ? "bg-destructive" : isComplete ? "bg-emerald-500" : "bg-emerald-500 animate-pulse"
                            }`} />
                            <span className="font-medium text-sm">{cron.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-background">{cron.freq}</span>
                        </div>

                        {/* Progress bar */}
                        {cron.pipeline && cron.pipeline.total > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                              <span>{cron.pipeline.done.toLocaleString()} / {cron.pipeline.total.toLocaleString()}</span>
                              <span className={isComplete ? "text-emerald-500 font-medium" : ""}>
                                {isComplete ? "✓ Completo" : cron.pipeline.label}
                              </span>
                            </div>
                            <Progress value={pct ?? 0} className="h-1.5" />
                          </div>
                        )}

                        {/* Last run info */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {ago ? (
                              <>Último run: <span className="text-foreground font-medium">{ago}</span></>
                            ) : (
                              "Sin datos aún"
                            )}
                          </span>
                          {status && (
                            <span className="flex items-center gap-1">
                              <span className="text-foreground font-medium">{status.count24h}</span> ops/24h
                              {hasErrors && (
                                <span className="text-destructive ml-1">· {status.errors} err</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Recent activity preview */}
                        {status && status.recentLogs.length > 0 && (
                          <div className="border-t border-border/50 pt-2 space-y-0.5">
                            {status.recentLogs.slice(0, 2).map((log, i) => (
                              <p key={i} className="text-[10px] text-muted-foreground truncate">
                                <span className="text-foreground/60">
                                  {new Date(log.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {" "}{log.reason}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Full recent logs */}
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
                          {!["auto_approve", "auto_reject"].includes(log.action_type) && (
                            <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{log.function_name}</span>
                          <span className="flex-1 truncate text-xs">{log.reason}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(log.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
