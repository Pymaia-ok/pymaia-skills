import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { checkIsAdmin } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, Languages, RefreshCw, ShieldCheck, ShieldAlert, Shield,
  CheckCircle2, XCircle, Clock, TrendingUp, Zap, Database
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
      return {
        approved: approved.count ?? 0,
        pending: pending.count ?? 0,
        rejected: rejected.count ?? 0,
        installs,
      };
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
      const [verified, flagged, unverified] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").eq("security_status", "verified"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").eq("security_status", "flagged"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").eq("security_status", "unverified"),
      ]);
      return { verified: verified.count ?? 0, flagged: flagged.count ?? 0, unverified: unverified.count ?? 0 };
    },
    enabled: !!isAdmin,
    refetchInterval: 30000,
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

  const { data: cronJobs } = useQuery({
    queryKey: ["cron-jobs"],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" as const });
      // We can't query cron.job directly via client, so we'll show known crons statically
      return null;
    },
    enabled: !!isAdmin,
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

  const CRON_LIST = [
    { name: "Auto-approve skills", freq: "Cada 3 min", batch: 100 },
    { name: "Quality maintenance", freq: "Cada 10 min", batch: 50 },
    { name: "Traducir skills", freq: "Cada 1 min", batch: 100 },
    { name: "Traducir conectores", freq: "Cada 2 min", batch: 30 },
    { name: "Sync estrellas skills", freq: "Cada 1 min", batch: 80 },
    { name: "Sync estrellas conectores", freq: "Cada 2 min", batch: 50 },
    { name: "Verificar seguridad", freq: "Cada 2 min", batch: 30 },
    { name: "Enriquecer skills IA", freq: "Cada 3 min", batch: 10 },
    { name: "Sync Smithery", freq: "Diario 6:00 UTC", batch: "auto" },
    { name: "Sync Official Registry", freq: "Diario 6:30 UTC", batch: "auto" },
    { name: "Sync GitHub Curated", freq: "Diario 7:00 UTC", batch: "auto" },
    { name: "Sync skills diario", freq: "Diario 6:00 UTC", batch: "auto" },
    { name: "Discover trending", freq: "Lunes 6:00 UTC", batch: "auto" },
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

          {/* Automation Pipelines */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Translation */}
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

            {/* Security */}
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

            {/* Connector Sync */}
            <div className="p-5 rounded-2xl bg-secondary">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Sync Conectores</h2>
              </div>
              <p className="text-2xl font-bold">{connectorStats?.total.toLocaleString() ?? "..."}</p>
              <p className="text-xs text-muted-foreground">
                Smithery 6AM · Official 6:30AM · GitHub 7AM UTC
              </p>
            </div>
          </div>

          {/* Active Cron Jobs */}
          <div className="p-5 rounded-2xl bg-secondary mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold">Trabajos automatizados activos</h2>
              <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                {CRON_LIST.length} activos
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CRON_LIST.map(cron => (
                <div key={cron.name} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-background/50">
                  <span className="font-medium">{cron.name}</span>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span>{cron.freq}</span>
                    {typeof cron.batch === "number" && <span className="text-xs">·  {cron.batch}/lote</span>}
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              ))}
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
                    <span className="flex-1 truncate">{log.reason}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
