import { supabase } from "@/integrations/supabase/client";

export interface SkillFromDB {
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  description_human: string;
  use_cases: unknown;
  target_roles: string[];
  install_command: string;
  github_url: string | null;
  video_url: string | null;
  time_to_install_minutes: number;
  install_count: number;
  avg_rating: number;
  review_count: number;
  industry: string[];
  status: string;
  creator_id: string | null;
  created_at: string;
}

export function parseUseCases(uc: unknown): { title: string; before: string; after: string }[] {
  if (Array.isArray(uc)) return uc as { title: string; before: string; after: string }[];
  return [];
}

export interface ReviewFromDB {
  id: string;
  skill_id: string;
  user_id: string;
  rating: number;
  time_saved: string | null;
  comment: string | null;
  created_at: string;
  profiles?: { display_name: string | null; role: string | null } | null;
}

export async function fetchSkills(filters?: {
  search?: string;
  industry?: string;
  sortBy?: "rating" | "installs";
  roles?: string[];
}) {
  let query = supabase.from("skills").select("*").eq("status", "approved");

  if (filters?.industry) {
    query = query.contains("industry", [filters.industry]);
  }
  if (filters?.roles && filters.roles.length > 0) {
    query = query.overlaps("target_roles", filters.roles);
  }
  if (filters?.sortBy === "installs") {
    query = query.order("install_count", { ascending: false });
  } else {
    query = query.order("avg_rating", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  let results = (data || []) as SkillFromDB[];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        s.description_human.toLowerCase().includes(q)
    );
  }

  return results;
}

export async function fetchSkillBySlug(slug: string) {
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as SkillFromDB | null;
}

export async function fetchReviewsForSkill(skillId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("skill_id", skillId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ReviewFromDB[];
}

export async function createReview(review: {
  skill_id: string;
  user_id: string;
  rating: number;
  time_saved?: string;
  comment?: string;
}) {
  const { error } = await supabase.from("reviews").insert(review);
  if (error) throw error;
}
