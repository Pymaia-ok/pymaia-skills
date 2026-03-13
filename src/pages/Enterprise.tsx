import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import {
  Building2, BarChart3, Package, Shield, CheckCircle2, Clock, XCircle,
  Loader2, ExternalLink, Star, Download, TrendingUp, Crown, Zap, Rocket,
  ArrowRight, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ───
interface EnterpriseApp {
  id: string;
  company_name: string;
  company_website: string | null;
  company_description: string | null;
  contact_email: string;
  plugin_slugs: string[];
  api_documentation_url: string | null;
  status: string;
  tier: string;
  review_notes: string | null;
  created_at: string;
}

interface PluginStat {
  slug: string;
  name: string;
  install_count: number;
  avg_rating: number;
  review_count: number;
  github_stars: number;
  status: string;
}

// ─── Tiers ───
const tiers = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "",
    icon: <Package className="w-6 h-6" />,
    features: ["Hasta 3 plugins", "Badge básico", "Analytics limitado", "Soporte comunidad"],
    cta: "Empezar gratis",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    period: "/mes",
    icon: <Zap className="w-6 h-6" />,
    features: ["Plugins ilimitados", 'Badge "Verified"', "Analytics completo", "Soporte prioritario", "Listing destacado"],
    cta: "Upgrade a Pro",
    highlight: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: <Crown className="w-6 h-6" />,
    features: ["Plugins privados", "API de distribución", "SLA garantizado", "Co-marketing", "Account manager dedicado"],
    cta: "Contactar ventas",
    highlight: false,
  },
];

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, label: "En revisión", color: "text-yellow-500 bg-yellow-500/10" },
  approved: { icon: <CheckCircle2 className="w-4 h-4" />, label: "Aprobada", color: "text-green-500 bg-green-500/10" },
  rejected: { icon: <XCircle className="w-4 h-4" />, label: "Rechazada", color: "text-red-500 bg-red-500/10" },
};

// ─── Main Component ───
const Enterprise = () => {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");
  useSEO({
    title: isEs ? "Portal Empresarial — Pymaia" : "Enterprise Portal — Pymaia",
    description: isEs
      ? "Listá y gestioná tus plugins empresariales en el marketplace de Pymaia."
      : "List and manage your enterprise plugins on the Pymaia marketplace.",
  });
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"dashboard" | "apply" | "pricing">("dashboard");

  // Fetch user's enterprise applications
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["enterprise-apps", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enterprise_applications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any as EnterpriseApp[];
    },
    enabled: !!user,
  });

  // Fetch user's plugins with stats
  const { data: myPlugins } = useQuery({
    queryKey: ["my-plugins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plugins")
        .select("slug, name, install_count, avg_rating, review_count, github_stars, status")
        .eq("creator_id", user!.id)
        .order("install_count", { ascending: false });
      if (error) throw error;
      return (data || []) as PluginStat[];
    },
    enabled: !!user,
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const hasApprovedApp = applications?.some((a) => a.status === "approved");
  const currentTier = applications?.find((a) => a.status === "approved")?.tier || "free";

  // Aggregate stats
  const totalInstalls = myPlugins?.reduce((sum, p) => sum + p.install_count, 0) || 0;
  const avgRating = myPlugins?.length ? (myPlugins.reduce((sum, p) => sum + p.avg_rating, 0) / myPlugins.length).toFixed(1) : "0";
  const totalReviews = myPlugins?.reduce((sum, p) => sum + p.review_count, 0) || 0;

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "apply", label: "Aplicar", icon: <Shield className="w-4 h-4" /> },
    { key: "pricing", label: "Planes", icon: <Crown className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-7 h-7 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Portal Empresarial</h1>
            {hasApprovedApp && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-500">
                ✓ Verificado
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Gestioná tus plugins, analytics y verificación empresarial.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-8 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Dashboard Tab */}
          {tab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Plugins", value: myPlugins?.length || 0, icon: <Package className="w-5 h-5" /> },
                  { label: "Instalaciones", value: totalInstalls, icon: <Download className="w-5 h-5" /> },
                  { label: "Rating promedio", value: avgRating, icon: <Star className="w-5 h-5" /> },
                  { label: "Reviews", value: totalReviews, icon: <TrendingUp className="w-5 h-5" /> },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="text-muted-foreground mb-2">{stat.icon}</div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Plugins Table */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Mis plugins</h2>
                {!myPlugins?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No tenés plugins publicados aún.</p>
                    <Link to="/crear-skill" className="text-sm text-foreground underline mt-2 inline-block">
                      Crear tu primer plugin →
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plugin</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Installs</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Rating</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reviews</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stars</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myPlugins.map((p) => (
                          <tr key={p.slug} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <Link to={`/plugin/${p.slug}`} className="font-medium text-foreground hover:underline">
                                {p.name}
                              </Link>
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{p.install_count.toLocaleString()}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{p.avg_rating > 0 ? `⭐ ${p.avg_rating}` : "—"}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{p.review_count}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{p.github_stars}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Application Status */}
              {applications && applications.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Solicitudes de verificación</h2>
                  <div className="space-y-3">
                    {applications.map((app) => {
                      const s = statusConfig[app.status] || statusConfig.pending;
                      return (
                        <div key={app.id} className="rounded-2xl border border-border bg-card p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{app.company_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(app.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>
                              {s.icon} {s.label}
                            </span>
                          </div>
                          {app.review_notes && (
                            <p className="text-sm text-muted-foreground mt-3 p-3 bg-secondary rounded-xl">{app.review_notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Apply Tab */}
          {tab === "apply" && (
            <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EnterpriseApplicationForm userId={user.id} userEmail={user.email || ""} onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["enterprise-apps"] });
                setTab("dashboard");
              }} />
            </motion.div>
          )}

          {/* Pricing Tab */}
          {tab === "pricing" && (
            <motion.div key="pricing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-3 gap-6">
                {tiers.map((tier, i) => (
                  <motion.div
                    key={tier.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`rounded-2xl border p-6 flex flex-col ${
                      tier.highlight
                        ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="text-muted-foreground mb-4">{tier.icon}</div>
                    <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2 mb-4">
                      <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                      {tier.period && <span className="text-sm text-muted-foreground">{tier.period}</span>}
                    </div>
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={tier.highlight ? "default" : "outline"}
                      className="w-full rounded-full"
                      onClick={() => {
                        if (tier.key === "free") setTab("apply");
                        else toast.info("Próximamente. Contactanos a team@pymaia.com para planes pagos.");
                      }}
                    >
                      {currentTier === tier.key ? "Plan actual" : tier.cta}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Application Form ───
function EnterpriseApplicationForm({ userId, userEmail, onSuccess }: { userId: string; userEmail: string; onSuccess: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [apiDocs, setApiDocs] = useState("");
  const [pluginSlugs, setPluginSlugs] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("enterprise_applications" as any).insert({
        user_id: userId,
        company_name: companyName.trim(),
        company_website: website.trim() || null,
        company_description: description.trim() || null,
        contact_email: email.trim(),
        plugin_slugs: pluginSlugs.split(",").map((s) => s.trim()).filter(Boolean),
        api_documentation_url: apiDocs.trim() || null,
      });
      if (error) throw error;
      toast.success("Solicitud enviada. Te contactaremos pronto.");
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar la solicitud");
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Solicitar verificación empresarial</h2>
        <p className="text-sm text-muted-foreground">
          Completá los datos de tu empresa para obtener el badge "Enterprise Verified" y acceder a features premium.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block text-foreground">Nombre de la empresa *</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            placeholder="Acme Corp" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block text-foreground">Sitio web</label>
          <input value={website} onChange={(e) => setWebsite(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            placeholder="https://acme.com" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block text-foreground">Email de contacto *</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            placeholder="team@acme.com" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block text-foreground">Descripción de la empresa</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="¿Qué hace tu empresa y por qué quiere listar plugins?" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block text-foreground">Plugins a listar (slugs, separados por coma)</label>
          <input value={pluginSlugs} onChange={(e) => setPluginSlugs(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            placeholder="mi-crm-plugin, analytics-tool" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block text-foreground">URL de documentación de API</label>
          <input value={apiDocs} onChange={(e) => setApiDocs(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            placeholder="https://docs.acme.com/api" />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting || !companyName.trim() || !email.trim()} className="w-full rounded-full gap-2" size="lg">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {isSubmitting ? "Enviando..." : "Enviar solicitud"}
      </Button>

      <div className="rounded-xl bg-secondary p-4 space-y-2">
        <p className="text-xs font-medium text-foreground">Criterios de verificación:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✓ Plugin sigue estructura estándar de Claude Code</li>
          <li>✓ Sin código malicioso ni exfiltración de datos</li>
          <li>✓ MCPs manejan errores correctamente</li>
          <li>✓ Documentación clara y completa</li>
          <li>✓ Auth/secrets manejados de forma segura</li>
          <li>✓ Empresa tiene términos de servicio y soporte</li>
        </ul>
      </div>
    </form>
  );
}

export default Enterprise;
