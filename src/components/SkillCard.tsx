import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Heart, ShieldCheck, Download } from "lucide-react";
import type { SkillFromDB } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { TrustBadgeCompact } from "@/components/TrustBadge";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toString();
}

interface SkillCardProps {
  skill: SkillFromDB;
  index?: number;
}

const SkillCard = forwardRef<HTMLDivElement, SkillCardProps>(({ skill, index = 0 }, ref) => {
  const { t, i18n } = useTranslation();
  const catLabel = t(`categories.${skill.category}`, skill.category);
  const displayName = (i18n.language === "es" && skill.display_name_es) ? skill.display_name_es : skill.display_name;
  const tagline = (i18n.language === "es" && skill.tagline_es) ? skill.tagline_es : skill.tagline;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.4 }}
    >
      <Link
        to={`/skill/${skill.slug}`}
        className="flex flex-col h-full p-6 rounded-2xl bg-secondary hover:bg-accent transition-all group"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {catLabel}
          </span>
          {skill.security_status === "verified" && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              {t("trust.verified")}
            </span>
          )}
          {skill.industry.slice(0, 1).map((ind) => (
            <span
              key={ind}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-background text-muted-foreground"
            >
              {ind}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-semibold mb-1.5 group-hover:text-foreground transition-colors truncate">
          {displayName}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {tagline}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            {skill.review_count > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
                <span className="text-sm font-medium">{Number(skill.avg_rating).toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({skill.review_count})</span>
              </div>
            )}
            {skill.install_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Download className="w-3 h-3" />
                <span>{formatCount(skill.install_count)}</span>
              </div>
            )}
            {skill.github_stars > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="w-3 h-3" />
                <span>{formatCount(skill.github_stars)}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {skill.time_to_install_minutes} {t("skillCard.min")}
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-sm font-medium text-foreground group-hover:underline">
            {t("skillCard.viewInstall")}
          </span>
        </div>
      </Link>
    </motion.div>
  );
});

SkillCard.displayName = "SkillCard";

export default SkillCard;
