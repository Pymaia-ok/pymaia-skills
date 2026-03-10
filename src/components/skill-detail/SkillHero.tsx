import { motion } from "framer-motion";

interface SkillHeroProps {
  displayName: string;
  tagline: string;
  industry: string[];
}

export default function SkillHero({ displayName, tagline, industry }: SkillHeroProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-4">
        {industry.map((ind) => (
          <span key={ind} className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{ind}</span>
        ))}
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{displayName}</h1>
      <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl">{tagline}</p>
    </motion.div>
  );
}
