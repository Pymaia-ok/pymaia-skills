import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, Download, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface CreatorStat {
  user_id: string;
  count: number;
  totalInstalls: number;
  totalRating: number;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified_publisher: boolean;
}

export default function CreatorLeaderboard() {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const { data: creators } = useQuery({
    queryKey: ["creator-leaderboard"],
    queryFn: async () => {
      const { data: skills } = await supabase
        .from("skills")
        .select("creator_id, avg_rating, install_count")
        .eq("status", "approved")
        .not("creator_id", "is", null);

      if (!skills?.length) return [];

      const stats: Record<string, { count: number; totalInstalls: number; totalRating: number }> = {};
      for (const s of skills) {
        if (!s.creator_id) continue;
        if (!stats[s.creator_id]) stats[s.creator_id] = { count: 0, totalInstalls: 0, totalRating: 0 };
        stats[s.creator_id].count++;
        stats[s.creator_id].totalInstalls += s.install_count;
        stats[s.creator_id].totalRating += Number(s.avg_rating);
      }

      const sorted = Object.entries(stats)
        .filter(([, s]) => s.count >= 2)
        .sort(([, a], [, b]) => b.count - a.count || b.totalInstalls - a.totalInstalls)
        .slice(0, 10);

      if (!sorted.length) return [];

      const ids = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, is_verified_publisher")
        .in("user_id", ids);

      const profileMap: Record<string, any> = {};
      for (const p of profiles || []) profileMap[p.user_id] = p;

      return sorted.map(([id, s]): CreatorStat => ({
        user_id: id,
        ...s,
        display_name: profileMap[id]?.display_name || null,
        username: profileMap[id]?.username || null,
        avatar_url: profileMap[id]?.avatar_url || null,
        is_verified_publisher: profileMap[id]?.is_verified_publisher || false,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!creators?.length) return null;

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            <span>{isEs ? "Creadores Destacados" : "Top Creators"}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            {isEs ? "Los mejores constructores de la comunidad" : "Best community builders"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {isEs ? "Creadores que comparten las mejores soluciones para tu agente de IA" : "Creators sharing the best solutions for your AI agent"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {creators.map((c, i) => {
            const avgRating = c.count > 0 ? (c.totalRating / c.count).toFixed(1) : "0.0";
            const name = c.display_name || c.username || "Anonymous";
            const profileLink = c.username ? `/u/${c.username}` : "#";

            return (
              <Link
                key={c.user_id}
                to={profileLink}
                className="flex flex-col items-center p-4 rounded-xl bg-secondary hover:bg-accent transition-colors text-center group"
              >
                <div className="relative mb-3">
                  {i < 3 && (
                    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-amber-400 text-amber-900" : i === 1 ? "bg-gray-300 text-gray-800" : "bg-amber-600 text-amber-100"
                    }`}>
                      {i + 1}
                    </div>
                  )}
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-semibold text-sm truncate max-w-[120px]">{name}</span>
                  {c.is_verified_publisher && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{c.count} skills</span>
                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3" />{avgRating}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
