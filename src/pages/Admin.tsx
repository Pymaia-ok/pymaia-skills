import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { checkIsAdmin } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, Clock, TrendingUp, Zap, Database,
  ShieldCheck, ListChecks
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import AdminOverviewTab from "@/components/admin/AdminOverviewTab";
import AdminSecurityTab from "@/components/admin/AdminSecurityTab";
import AdminReviewTab from "@/components/admin/AdminReviewTab";
import AdminCronsTab, { type CronDef } from "@/components/admin/AdminCronsTab";

const Admin = () => {
  const { user, loading } = useAuth();

  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkIsAdmin(user!.id),
    enabled: !!user?.id,
  });

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

  const { data: incidents } = useQuery({
    queryKey: ["security-incidents"],
    queryFn: async () => {
      const { data } = await supabase.from("security_incidents").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });

  const { data: openReports } = useQuery({
    queryKey: ["open-security-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("security_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });

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
            ...d, item_type: t.type, name: d[nameField] || d.slug,
            verdict: d.security_scan_result?.verdict || "UNKNOWN",
          })));
        }
      }
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
      if (action === "approve") await supabase.from(tableName).update({ security_status: "verified" }).eq("id", id);
      else if (action === "reject") await supabase.from(tableName).update({ status: "rejected", security_status: "flagged" }).eq("id", id);
      else if (action === "rescan") await supabase.functions.invoke("scan-security", { body: { item_id: id, item_type: itemType } });
    },
    onSuccess: (_, vars) => {
      toast.success(`Item ${vars.action === "approve" ? "aprobado" : vars.action === "reject" ? "rechazado" : "re-escaneando"}`);
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
    },
  });

  const { data: trustDistribution } = useQuery({
    queryKey: ["trust-distribution"],
    queryFn: async () => {
      const { data } = await supabase.from("skills").select("trust_score").eq("status", "approved");
      if (!data) return { official: 0, verified: 0, trusted: 0, reviewed: 0, new_: 0, avg: 0 };
      let official = 0, verified = 0, trusted = 0, reviewed = 0, new_ = 0, sum = 0;
      for (const s of data) {
        const score = s.trust_score ?? 0;
        sum += score;
        if (score >= 90) official++; else if (score >= 80) verified++; else if (score >= 60) trusted++; else if (score >= 40) reviewed++; else new_++;
      }
      return { official, verified, trusted, reviewed, new_, avg: data.length ? Math.round(sum / data.length) : 0 };
    },
    enabled: !!isAdmin,
    refetchInterval: 60000,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["automation-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_logs").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });

  const { data: qualityInsights } = useQuery({
    queryKey: ["quality-insights"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quality_insights")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });

  const { data: cronStatus } = useQuery({
    queryKey: ["cron-live-status"],
    queryFn: async () => {
      const { data: logs } = await supabase.from("automation_logs").select("function_name, action_type, reason, created_at, metadata").order("created_at", { ascending: false }).limit(200);
      if (!logs) return {};
      const byFunc: Record<string, { lastRun: string; count24h: number; lastAction: string; lastReason: string; errors: number; recentLogs: typeof logs }> = {};
      const now = Date.now();
      const h24 = 24 * 60 * 60 * 1000;
      for (const log of logs) {
        const fn = log.function_name;
        if (!byFunc[fn]) byFunc[fn] = { lastRun: log.created_at, count24h: 0, lastAction: log.action_type, lastReason: log.reason, errors: 0, recentLogs: [] };
        if (now - new Date(log.created_at).getTime() < h24) byFunc[fn].count24h++;
        if (log.action_type?.includes("error") || log.action_type?.includes("fail")) byFunc[fn].errors++;
        if (byFunc[fn].recentLogs.length < 5) byFunc[fn].recentLogs.push(log);
      }
      return byFunc;
    },
    enabled: !!isAdmin,
    refetchInterval: 10000,
  });

  const { data: pipelineProgress } = useQuery({
    queryKey: ["pipeline-progress"],
    queryFn: async () => {
      const [totalApproved, untranslatedSkills, untranslatedConnectors, totalConnectors, unscannedSecurity, scannedSecurity, pendingSkills, enrichPending, totalPlugins, untranslatedPlugins] = await Promise.all([
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

  const CRON_LIST: CronDef[] = [
    { name: "Auto-approve skills", func: "auto-approve-skills", freq: "Cada 3 min",
      pipeline: pipelineProgress ? { done: pipelineProgress.skills.total, total: pipelineProgress.skills.total + pipelineProgress.pending, label: `${pipelineProgress.pending} pendientes` } : undefined },
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
    { name: "VT polling pendientes", func: "poll-vt-pending", freq: "Cada 10 min" },
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
                <ShieldCheck className="w-3.5 h-3.5" /> Seguridad
                {p0Count + p1Count > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">{p0Count + p1Count}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5" /> Review Queue
                {(reviewQueue?.length ?? 0) > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{reviewQueue?.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="crons">Automatización</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <AdminOverviewTab
                translatedCount={translatedCount}
                translationTotal={translationTotal}
                translationPercent={translationPercent}
                translationStats={translationStats}
                securityPercent={securityPercent}
                securityStats={securityStats}
                connectorStats={connectorStats}
                recentLogs={recentLogs}
              />
            </TabsContent>

            <TabsContent value="security">
              <AdminSecurityTab
                scanPercent={scanPercent}
                securityStats={securityStats}
                trustDistribution={trustDistribution}
                openIncidents={openIncidents}
                incidents={incidents}
                openReports={openReports}
                p0Count={p0Count}
                p1Count={p1Count}
              />
            </TabsContent>

            <TabsContent value="review">
              <AdminReviewTab
                reviewQueue={reviewQueue}
                onAction={(params) => reviewAction.mutate(params)}
              />
            </TabsContent>

            <TabsContent value="crons">
              <AdminCronsTab
                cronList={CRON_LIST}
                cronStatus={cronStatus}
                recentLogs={recentLogs}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
