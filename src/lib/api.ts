import { supabase } from "@/integrations/supabase/client";

// Detect if a query looks like a natural language intent vs simple keywords
export function isIntentQuery(query: string): boolean {
  if (!query || query.trim().length < 8) return false;
  const words = query.trim().split(/\s+/);
  if (words.length < 3) return false;
  // Spanish/English intent indicators
  const intentPatterns = /\b(quiero|necesito|como|cómo|ayuda|busco|hacer|crear|generar|automatizar|mejorar|optimizar|want|need|help|how|create|build|make|automate|improve|optimize|write|design|analyze|manage|review|deploy|test|send|track|monitor|connect|integrate|setup|configure)\b/i;
  return intentPatterns.test(query);
}

// Smart search using AI to interpret intent
export async function smartSearch(filters: {
  query: string;
  category?: string;
  sortBy?: string;
  page?: number;
}): Promise<{ data: SkillFromDB[]; count: number; keywords?: string[]; mode: string }> {
  const response = await supabase.functions.invoke("smart-search", {
    body: {
      query: filters.query,
      category: filters.category || null,
      sort_by: filters.sortBy || "rating",
      page: filters.page || 0,
    },
  });

  if (response.error) throw response.error;
  const result = response.data;
  if (result.error) throw new Error(result.error);

  const skills: SkillFromDB[] = (result.data || []).map((r: any) => ({
    id: r.id, slug: r.slug, display_name: r.display_name,
    tagline: r.tagline, tagline_es: r.tagline_es,
    description_human: r.description_human, description_human_es: r.description_human_es,
    category: r.category, industry: r.industry, target_roles: r.target_roles,
    install_command: r.install_command, github_url: r.github_url, video_url: r.video_url,
    time_to_install_minutes: r.time_to_install_minutes, install_count: r.install_count,
    avg_rating: r.avg_rating, review_count: r.review_count, github_stars: r.github_stars,
    use_cases: r.use_cases, creator_id: r.creator_id, created_at: r.created_at, status: r.status,
  }));

  return { data: skills, count: result.count || 0, keywords: result.keywords, mode: result.mode };
}

export const SKILL_CATEGORIES = [
  { key: "ia", label: "IA" },
  { key: "desarrollo", label: "Desarrollo" },
  { key: "diseño", label: "Diseño" },
  { key: "marketing", label: "Marketing" },
  { key: "automatización", label: "Automatización" },
  { key: "datos", label: "Datos" },
  { key: "creatividad", label: "Creatividad" },
  { key: "productividad", label: "Productividad" },
  { key: "legal", label: "Legal" },
  { key: "negocios", label: "Negocios" },
] as const;

export const PAGE_SIZE = 24;

export interface SkillFromDB {
  category: string;
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  tagline_es?: string | null;
  description_human: string;
  description_human_es?: string | null;
  use_cases: unknown;
  target_roles: string[];
  install_command: string;
  github_url: string | null;
  video_url: string | null;
  time_to_install_minutes: number;
  install_count: number;
  avg_rating: number;
  review_count: number;
  github_stars: number;
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
  category?: string;
  sortBy?: "rating" | "installs";
  roles?: string[];
  page?: number;
}): Promise<{ data: SkillFromDB[]; count: number }> {
  const page = filters?.page ?? 0;

  // Use fuzzy search function when there's a search query
  if (filters?.search && filters.search.trim().length > 0) {
    const { data, error } = await supabase.rpc("search_skills", {
      search_query: filters.search,
      filter_category: filters.category || null,
      filter_industry: filters.industry || null,
      filter_roles: filters.roles && filters.roles.length > 0 ? filters.roles : null,
      sort_by: filters.sortBy || "rating",
      page_num: page,
      page_size: PAGE_SIZE,
    });
    if (error) throw error;
    const rows = (data || []) as any[];
    const count = rows.length > 0 ? Number(rows[0].total_count) : 0;
    // Map RPC results to SkillFromDB shape
    const skills: SkillFromDB[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      display_name: r.display_name,
      tagline: r.tagline,
      tagline_es: r.tagline_es,
      description_human: r.description_human,
      description_human_es: r.description_human_es,
      category: r.category,
      industry: r.industry,
      target_roles: r.target_roles,
      install_command: r.install_command,
      github_url: r.github_url,
      video_url: r.video_url,
      time_to_install_minutes: r.time_to_install_minutes,
      install_count: r.install_count,
      avg_rating: r.avg_rating,
      review_count: r.review_count,
      github_stars: r.github_stars,
      use_cases: r.use_cases,
      creator_id: r.creator_id,
      created_at: r.created_at,
      status: r.status,
    }));
    return { data: skills, count };
  }

  // Standard query without search
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from("skills").select("*", { count: "exact" }).eq("status", "approved");
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.industry) query = query.contains("industry", [filters.industry]);
  if (filters?.roles && filters.roles.length > 0) query = query.overlaps("target_roles", filters.roles);
  if (filters?.sortBy === "installs") query = query.order("github_stars", { ascending: false });
  else query = query.order("avg_rating", { ascending: false });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data || []) as SkillFromDB[], count: count ?? 0 };
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
