import { supabase } from "@/integrations/supabase/client";

// Detect if a query looks like a natural language intent vs simple keywords
export function isIntentQuery(query: string): boolean {
  if (!query || query.trim().length < 8) return false;
  const words = query.trim().split(/\s+/);
  if (words.length < 3) return false;
  const intentPatterns = /\b(quiero|necesito|como|cómo|ayuda|busco|hacer|crear|generar|automatizar|mejorar|optimizar|want|need|help|how|create|build|make|automate|improve|optimize|write|design|analyze|manage|review|deploy|test|send|track|monitor|connect|integrate|setup|configure)\b/i;
  return intentPatterns.test(query);
}

// Semantic search using vector embeddings (replaces smart-search for intent queries)
export async function semanticSearch(filters: {
  query: string;
  category?: string;
  sortBy?: string;
  page?: number;
}): Promise<{ data: SkillFromDB[]; count: number; mode: string; keywords?: string[] }> {
  const response = await supabase.functions.invoke("semantic-search", {
    body: {
      query: filters.query,
      category: filters.category || null,
      sort_by: filters.sortBy || "rating",
      page: filters.page || 0,
    },
  });

  // If semantic search is unavailable, fallback to smart-search
  if (response.error || response.data?.fallback) {
    return smartSearch(filters);
  }

  const result = response.data;
  if (result.error) throw new Error(result.error);

  const skills: SkillFromDB[] = (result.data || []).map((r: any) => ({
    id: r.id, slug: r.slug, display_name: r.display_name, display_name_es: r.display_name_es,
    tagline: r.tagline, tagline_es: r.tagline_es,
    description_human: r.description_human, description_human_es: r.description_human_es,
    category: r.category, industry: r.industry, target_roles: r.target_roles,
    install_command: r.install_command, github_url: r.github_url, video_url: r.video_url,
    time_to_install_minutes: r.time_to_install_minutes, install_count: r.install_count,
    avg_rating: r.avg_rating, review_count: r.review_count, github_stars: r.github_stars,
    use_cases: r.use_cases, creator_id: r.creator_id, created_at: r.created_at, status: r.status,
  }));

  return { data: skills, count: result.count || 0, mode: result.mode || "semantic", keywords: result.keywords };
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
    id: r.id, slug: r.slug, display_name: r.display_name, display_name_es: r.display_name_es,
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

export const SKILL_CATEGORIES_FALLBACK = [
  { key: "ia", label: "IA", emoji: "🤖" },
  { key: "desarrollo", label: "Desarrollo", emoji: "💻" },
  { key: "automatización", label: "Automatización", emoji: "⚡" },
  { key: "diseño", label: "Diseño", emoji: "🎨" },
  { key: "productividad", label: "Productividad", emoji: "📋" },
  { key: "datos", label: "Datos", emoji: "📊" },
  { key: "marketing", label: "Marketing", emoji: "📢" },
  { key: "legal", label: "Legal", emoji: "⚖️" },
  { key: "negocios", label: "Negocios", emoji: "💼" },
  { key: "creatividad", label: "Creatividad", emoji: "🎬" },
  { key: "ventas", label: "Ventas", emoji: "🤝" },
  { key: "producto", label: "Producto", emoji: "🧩" },
  { key: "finanzas", label: "Finanzas", emoji: "💰" },
  { key: "rrhh", label: "RRHH", emoji: "👥" },
  { key: "soporte", label: "Soporte", emoji: "🎧" },
  { key: "salud", label: "Salud", emoji: "🏥" },
  { key: "educación", label: "Educación", emoji: "🎓" },
  { key: "ecommerce", label: "E-commerce", emoji: "🛒" },
  { key: "operaciones", label: "Operaciones", emoji: "⚙️" },
] as const;

// Keep backward compat alias
export const SKILL_CATEGORIES = SKILL_CATEGORIES_FALLBACK;

export interface CategoryFromDB {
  slug: string;
  display_name: string;
  display_name_es: string | null;
  emoji: string | null;
  description: string | null;
  description_es: string | null;
  skill_count: number | null;
  sort_order: number | null;
}

export async function fetchCategories(): Promise<CategoryFromDB[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return [];
  return data as CategoryFromDB[];
}

export const PAGE_SIZE = 24;

export interface SkillFromDB {
  category: string;
  id: string;
  slug: string;
  display_name: string;
  display_name_es?: string | null;
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
  security_status?: string;
  trust_score?: number | null;
  security_scan_result?: any;
  last_commit_at?: string | null;
  quality_score?: number | null;
  is_stale?: boolean | null;
  version?: string | null;
  eval_verified?: boolean;
  readme_raw?: string | null;
  readme_summary?: string | null;
  readme_summary_es?: string | null;
  changelog?: string | null;
  required_mcps?: any;
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
      filter_industry: null,
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
      display_name_es: r.display_name_es,
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

  const selectCols = "id,slug,display_name,display_name_es,tagline,tagline_es,description_human,description_human_es,category,industry,target_roles,install_command,github_url,video_url,time_to_install_minutes,install_count,avg_rating,review_count,github_stars,use_cases,creator_id,created_at,status,security_status,trust_score,last_commit_at";
  let query = supabase.from("skills").select(selectCols, { count: "estimated" }).eq("status", "approved").or("security_scan_result.not.is.null,trust_score.gte.60");
  if (filters?.category) {
    // Industries added as categories — search both columns
    const industryKeys = ["arquitectura", "ingeniería", "salud", "educación", "tecnologia"];
    if (industryKeys.includes(filters.category)) {
      query = query.or(`category.eq.${filters.category},industry.cs.{${filters.category}}`);
    } else {
      query = query.eq("category", filters.category);
    }
  }
  if (filters?.roles && filters.roles.length > 0) query = query.overlaps("target_roles", filters.roles);
  if (filters?.sortBy === "installs") query = query.order("github_stars", { ascending: false });
  else query = query.order("avg_rating", { ascending: false });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data || []) as SkillFromDB[], count: count ?? 0 };
}

export async function fetchAllSkills() {
  const { data, error } = await supabase.from("skills").select("*").eq("status", "approved").or("security_scan_result.not.is.null,trust_score.gte.60").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SkillFromDB[];
}

export async function fetchSkillBySlug(slug: string, shareToken?: string) {
  // Private skills: use SECURITY DEFINER function to verify token server-side
  if (shareToken) {
    const { data, error } = await supabase.rpc("fetch_skill_by_share_token", {
      _slug: slug,
      _token: shareToken,
    });
    if (error) throw error;
    const rows = data as SkillFromDB[] | null;
    return rows && rows.length > 0 ? rows[0] : null;
  }
  // Public skills: standard query (RLS handles visibility)
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
  required_mcps?: any[];
  is_public?: boolean;
}) {
  // Generate share_token for private skills
  const data: any = { ...skill };
  if (data.is_public === false) {
    data.share_token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  const { error } = await supabase.from("skills").insert(data);
  if (error) throw error;
}

// Plugins
export async function submitPlugin(plugin: {
  slug: string;
  name: string;
  description: string;
  category?: string;
  github_url?: string;
  creator_id: string;
  platform?: string;
  source?: string;
}) {
  const { error } = await supabase.from("plugins").insert({
    slug: plugin.slug,
    name: plugin.name,
    description: plugin.description,
    category: plugin.category || "development",
    github_url: plugin.github_url || null,
    creator_id: plugin.creator_id,
    platform: plugin.platform || "claude-code",
    source: plugin.source || "community",
    status: "approved",
    is_official: false,
    is_anthropic_verified: false,
  });
  if (error) throw error;
}

export async function updateSkillStatus(skillId: string, status: "approved" | "rejected") {
  const { error } = await supabase.from("skills").update({ status }).eq("id", skillId);
  if (error) throw error;
}

export async function trackInstallation(skillId: string, userId: string) {
  // Insert triggers automatic install_count increment via DB trigger
  await supabase.from("installations").insert({ skill_id: skillId, user_id: userId });
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

// Bundles
export interface BundleFromDB {
  id: string;
  role_slug: string;
  title: string;
  title_es: string | null;
  description: string;
  description_es: string | null;
  hero_emoji: string;
  skill_slugs: string[];
  is_active: boolean;
  created_at: string;
}

export async function fetchBundle(roleSlug: string): Promise<{ bundle: BundleFromDB; skills: SkillFromDB[] } | null> {
  const { data: bundle, error } = await supabase
    .from("skill_bundles" as any)
    .select("*")
    .eq("role_slug", roleSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !bundle) return null;
  const b = bundle as any as BundleFromDB;

  const { data: skills } = await supabase
    .from("skills")
    .select("*")
    .in("slug", b.skill_slugs)
    .eq("status", "approved");

  // Maintain curated order
  const map = new Map((skills || []).map((s: any) => [s.slug, s]));
  const ordered = b.skill_slugs.map((slug) => map.get(slug)).filter(Boolean) as SkillFromDB[];

  return { bundle: b, skills: ordered };
}

export async function fetchAllBundles(): Promise<BundleFromDB[]> {
  const { data, error } = await supabase
    .from("skill_bundles" as any)
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data || []) as any as BundleFromDB[];
}
