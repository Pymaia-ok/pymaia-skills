import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Skill } from "@/data/skills";

interface SkillCardProps {
  skill: Skill;
  index?: number;
}

const SkillCard = ({ skill, index = 0 }: SkillCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1, duration: 0.4 }}
  >
    <Link
      to={`/skill/${skill.slug}`}
      className="block p-6 rounded-2xl bg-secondary hover:bg-accent transition-all group"
    >
      <div className="flex items-center gap-2 mb-3">
        {skill.industry.slice(0, 2).map((ind) => (
          <span
            key={ind}
            className="text-xs font-medium px-2.5 py-1 rounded-full bg-background text-muted-foreground"
          >
            {ind}
          </span>
        ))}
      </div>

      <h3 className="text-lg font-semibold mb-1.5 group-hover:text-foreground transition-colors">
        {skill.displayName}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {skill.tagline}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
          <span className="text-sm font-medium">{skill.avgRating}</span>
          <span className="text-xs text-muted-foreground">
            ({skill.reviewCount})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {skill.installCount.toLocaleString()} instalaciones
          </span>
          <span className="text-xs text-muted-foreground">
            {skill.timeToInstallMinutes} min
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <span className="text-sm font-medium text-foreground group-hover:underline">
          Ver cómo instalarla →
        </span>
      </div>
    </Link>
  </motion.div>
);

export default SkillCard;
