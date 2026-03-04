import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchSkills, SKILL_CATEGORIES } from "@/lib/api";

const StatsBar = () => {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["skills-stats"],
    queryFn: () => fetchSkills({ sortBy: "installs", page: 0 }),
  });

  const totalSkills = data?.count ?? 0;
  // Estimate total installs from first page
  const totalInstalls = data?.data?.reduce((sum, s) => sum + s.install_count, 0) ?? 0;
  const totalCategories = SKILL_CATEGORIES.length;

  const stats = [
    { value: totalSkills.toLocaleString(), label: t("landing.statsSkills") },
    { value: totalInstalls.toLocaleString()+"+", label: t("landing.statsInstalls") },
    { value: totalCategories.toString(), label: t("landing.statsCategories") },
  ];

  return (
    <section className="py-16 border-y border-border">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-8 text-center"
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-5xl font-bold tracking-tight mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default StatsBar;
