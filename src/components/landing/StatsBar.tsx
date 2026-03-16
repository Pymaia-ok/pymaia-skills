import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useEffect, useState } from "react";
import { Shield } from "lucide-react";

const AnimatedNumber = ({ target }: { target: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!isInView || target === 0) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCurrent(Math.min(Math.round(increment * step), target));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{current.toLocaleString()}</span>;
};

const StatsBar = () => {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["landing-stats-counts"],
    queryFn: async () => {
      const [skills, connectors, plugins, scannedSkills, scannedConnectors, scannedPlugins] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").neq("security_status", "unverified"),
        supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved").neq("security_status", "unverified"),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved").neq("security_status", "unverified"),
      ]);
      return {
        skills: skills.count ?? 0,
        connectors: connectors.count ?? 0,
        plugins: plugins.count ?? 0,
        scanned: (scannedSkills.count ?? 0) + (scannedConnectors.count ?? 0) + (scannedPlugins.count ?? 0),
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  const stats = [
    { value: data?.skills ?? 0, label: t("landing.statsSkills"), icon: null },
    { value: data?.connectors ?? 0, label: t("landing.statsConnectors"), icon: null },
    { value: data?.plugins ?? 0, label: t("landing.statsPlugins"), icon: null },
    { value: data?.scanned ?? 0, label: t("landing.statsSecurityScanned"), icon: <Shield className="w-4 h-4 text-primary inline-block mr-1" /> },
  ];

  return (
    <section className="py-16 border-y border-border bg-secondary/40">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-5xl font-bold tracking-tight mb-1">
                <AnimatedNumber target={stat.value} />
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.icon}{stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default StatsBar;
