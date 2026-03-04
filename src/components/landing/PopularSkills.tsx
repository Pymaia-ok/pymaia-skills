import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchSkills } from "@/lib/api";
import SkillCard from "@/components/SkillCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const PopularSkills = () => {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["skills-popular-landing"],
    queryFn: () => fetchSkills({ sortBy: "installs" }),
  });

  const topSkills = data?.data?.slice(0, 6) ?? [];

  if (topSkills.length === 0) return null;

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <h2 className="section-title mb-4">{t("landing.popularTitle")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.popularSubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topSkills.map((skill, i) => (
            <SkillCard key={skill.id} skill={skill} index={i} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/explorar">
              {t("landing.popularCta")} <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PopularSkills;
