import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import SkillCard from "@/components/SkillCard";
import { fetchProfileByUsername, fetchUserSkills, fetchUserReviews } from "@/lib/api";
import { Star } from "lucide-react";

const UserProfile = () => {
  const { username } = useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => fetchProfileByUsername(username || ""),
    enabled: !!username,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["user-skills", profile?.user_id],
    queryFn: () => fetchUserSkills(profile!.user_id),
    enabled: !!profile?.user_id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["user-reviews", profile?.user_id],
    queryFn: () => fetchUserReviews(profile!.user_id),
    enabled: !!profile?.user_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24">
          <div className="h-20 w-20 rounded-full bg-secondary animate-pulse mb-4" />
          <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="section-title mb-4">Usuario no encontrado</h1>
          <Link to="/explorar" className="text-muted-foreground hover:text-foreground">← Volver</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 max-w-4xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-6 mb-6">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {(profile.display_name || profile.username || "U")[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name || profile.username || "Usuario"}</h1>
              {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
              {profile.role && <p className="text-sm text-muted-foreground mt-1 capitalize">{profile.role}</p>}
            </div>
          </div>
          {profile.bio && <p className="text-muted-foreground max-w-xl">{profile.bio}</p>}

          <div className="flex gap-6 mt-6 text-sm">
            <div>
              <span className="font-semibold text-foreground">{skills.filter(s => s.status === "approved").length}</span>{" "}
              <span className="text-muted-foreground">skills publicadas</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">{reviews.length}</span>{" "}
              <span className="text-muted-foreground">reviews</span>
            </div>
          </div>
        </motion.div>

        {skills.filter(s => s.status === "approved").length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
            <h2 className="text-xl font-semibold mb-6">Skills publicadas</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {skills.filter(s => s.status === "approved").map((skill, i) => (
                <SkillCard key={skill.id} skill={skill} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {reviews.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-xl font-semibold mb-6">Reviews escritas</h2>
            <div className="grid gap-4">
              {reviews.map(review => (
                <div key={review.id} className="p-5 rounded-2xl bg-secondary">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-foreground text-foreground" />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm mb-2">"{review.comment}"</p>}
                  {review.time_saved && (
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-background text-muted-foreground">
                      Ahorra {review.time_saved}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
