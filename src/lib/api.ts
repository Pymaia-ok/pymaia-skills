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
}

export interface ProfileFromDB {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  created_at: string;
}

// Skills
export async function fetchSkills(filters?: {
  search?: string;
  industry?: string;
  sortBy?: "rating" | "installs";
  roles?: string[];
}) {
  let query = supabase.from("skills").select("*").eq("status", "approved");
  if (filters?.industry) query = query.contains("industry", [filters.industry]);
  if (filters?.roles && filters.roles.length > 0) query = query.overlaps("target_roles", filters.roles);
  if (filters?.sortBy === "installs") query = query.order("install_count", { ascending: false });
  else query = query.order("avg_rating", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  let results = (data || []) as SkillFromDB[];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(s =>
      s.display_name.toLowerCase().includes(q) ||
      s.tagline.toLowerCase().includes(q) ||
      s.description_human.toLowerCase().includes(q)
    );
  }
  return results;
}

export async function fetchAllSkills() {
  const { data, error } = await supabase.from("skills").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SkillFromDB[];
}

export async function fetchSkillBySlug(slug: string) {
  const { data, error } = await supabase.from("skills").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as SkillFromDB | null;
}

export async function submitSkill(skill: {
  slug: string;
  display_name: string;
  tagline: string;
  description_human: string;
  use_cases: { title: string; before: string; after: string }[];
  target_roles: string[];
  install_command: string;
  github_url?: string;
  time_to_install_minutes: number;
  industry: string[];
  creator_id: string;
}) {
  const { error } = await supabase.from("skills").insert(skill);
  if (error) throw error;
}

export async function updateSkillStatus(skillId: string, status: "approved" | "rejected") {
  const { error } = await supabase.from("skills").update({ status }).eq("id", skillId);
  if (error) throw error;
}

export async function trackInstallation(skillId: string, userId: string) {
  await supabase.from("installations").insert({ skill_id: skillId, user_id: userId });
  // Increment install count
  const { data } = await supabase.from("skills").select("install_count").eq("id", skillId).maybeSingle();
  if (data) {
    await supabase.from("skills").update({ install_count: data.install_count + 1 }).eq("id", skillId);
  }
}

// Reviews
export async function fetchReviewsForSkill(skillId: string) {
  const { data, error } = await supabase.from("reviews").select("*").eq("skill_id", skillId).order("created_at", { ascending: false });
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

// Profiles
export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as ProfileFromDB | null;
}

export async function fetchProfileByUsername(username: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (error) throw error;
  return data as ProfileFromDB | null;
}

export async function updateProfile(userId: string, updates: { username?: string; display_name?: string; bio?: string; role?: string }) {
  const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
  if (error) throw error;
}

export async function fetchUserSkills(userId: string) {
  const { data, error } = await supabase.from("skills").select("*").eq("creator_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SkillFromDB[];
}

export async function fetchUserReviews(userId: string) {
  const { data, error } = await supabase.from("reviews").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ReviewFromDB[];
}

// Admin
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return !!data;
}
