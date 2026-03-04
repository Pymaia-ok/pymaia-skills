import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { SkillFromDB } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface SkillCardProps {
  skill: SkillFromDB;
  index?: number;
}

const SkillCard = ({ skill, index = 0 }: SkillCardProps) => {
  const { t } = useTranslation();
  const catLabel = t(`categories.${skill.category}`, skill.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.4 }}
    >
      <Link
        to={`/skill/${skill.slug}`}
        className="block p-6 rounded-2xl bg-secondary hover:bg-accent transition-all group"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {catLabel}
          </span>
          {skill.industry.slice(0, 1).map((ind) => (
            <span
              key={ind}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-background text-muted-foreground"
            >
              {ind}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-semibold mb-1.5 group-hover:text-foreground transition-colors">
          {skill.display_name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {skill.tagline}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
            <span className="text-sm font-medium">{Number(skill.avg_rating).toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">
              ({skill.review_count})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {skill.install_count.toLocaleString()} {t("skillCard.installations")}
            </span>
            <span className="text-xs text-muted-foreground">
              {skill.time_to_install_minutes} {t("skillCard.min")}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-sm font-medium text-foreground group-hover:underline">
            {t("skillCard.viewInstall")}
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

export default SkillCard;
