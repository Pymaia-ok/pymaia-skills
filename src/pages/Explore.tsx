import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import SkillCard from "@/components/SkillCard";
import { fetchSkills } from "@/lib/api";

const industries = ["Agencias", "Legal", "Consultoras", "E-commerce", "Startups"];

const Explore = () => {
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "installs">("rating");

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["skills", selectedIndustry, sortBy],
    queryFn: () => fetchSkills({ industry: selectedIndustry || undefined, sortBy }),
  });

  const filtered = useMemo(() => {
    if (!search) return skills;
    const q = search.toLowerCase();
    return skills.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        s.description_human.toLowerCase().includes(q)
    );
  }, [skills, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="section-title mb-4">Explorá skills</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Encontrá la skill perfecta para lo que necesitás hacer.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative mb-8"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="¿Qué querés hacer mejor? Ej: preparar propuestas, analizar datos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            <button
              onClick={() => setSelectedIndustry(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedIndustry
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => setSelectedIndustry(ind === selectedIndustry ? null : ind)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedIndustry === ind
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {ind}
              </button>
            ))}
          </motion.div>

          <div className="flex gap-4 mb-8 text-sm">
            {[
              { key: "rating" as const, label: "Mejor valoradas" },
              { key: "installs" as const, label: "Más usadas" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`transition-colors ${
                  sortBy === s.key
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((skill, i) => (
                <SkillCard key={skill.id} skill={skill} index={i} />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No encontramos skills para esa búsqueda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explore;
