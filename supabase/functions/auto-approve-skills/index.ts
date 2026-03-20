import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";
import { validateAdminRequest, unauthorizedResponse } from "../_shared/admin-auth.ts";

// Trusted GitHub orgs/users whose skills get auto-approved with lighter checks
const TRUSTED_SOURCES = [
  "anthropics", "anthropic", "vercel", "microsoft", "google", "aws",
  "openai", "langchain-ai", "supabase", "stripe", "modelcontextprotocol",
  "cloudflare", "docker", "hashicorp", "grafana", "elastic",
  "mongodb", "prisma", "drizzle-team", "trpc",
];

interface GitHubCheck {
  exists: boolean;
  archived: boolean;
  disabled: boolean;
  stars: number;
  hasLicense: boolean;
  hasReadme: boolean;
  lastPushAt: string | null;
  description: string | null;
}

/**
 * Quick GitHub pre-check: verifies repo exists, is not archived/disabled,
 * and gathers basic quality signals (stars, license, last activity).
 */
async function quickGitHubCheck(
  repoFullName: string,
  headers: Record<string, string>,
): Promise<GitHubCheck | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });
    if (res.status === 404) return { exists: false, archived: false, disabled: false, stars: 0, hasLicense: false, hasReadme: false, lastPushAt: null, description: null };
    if (res.status === 403 || res.status === 429) return null; // rate limited, skip
    if (!res.ok) return null;

    const data = await res.json();
    return {
      exists: true,
      archived: !!data.archived,
      disabled: !!data.disabled,
      stars: data.stargazers_count ?? 0,
      hasLicense: !!(data.license?.spdx_id && data.license.spdx_id !== "NOASSERTION"),
      hasReadme: data.size > 0, // repos with content
      lastPushAt: data.pushed_at ?? null,
      description: data.description ?? null,
    };
  } catch {
    return null; // network error, skip
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = validateAdminRequest(req);
  if (!auth.authorized) return unauthorizedResponse(req, auth.reason);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const githubToken = Deno.env.get("GITHUB_TOKEN");

    const { batchSize = 100 } = await req.json().catch(() => ({}));

    const ghHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "pymaia-skills-bot",
    };
    if (githubToken) ghHeaders["Authorization"] = `Bearer ${githubToken}`;

    // Fetch pending skills
    const { data: pending, error } = await supabase
      .from("skills")
      .select("id, slug, display_name, github_url, github_stars, security_status, security_notes, last_commit_at, description_human, creator_id, security_scan_result, install_command, readme_raw")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (error || !pending) {
      return new Response(JSON.stringify({ error: error?.message || "no data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let approved = 0;
    let rejected = 0;
    let skipped = 0;
    let rateLimited = false;

    for (const skill of pending) {
      if (rateLimited) { skipped++; continue; }

      const reasons: string[] = [];
      let shouldReject = false;
      let rejectReason = "";

      // Extract GitHub org/user and repo
      const ghMatch = skill.github_url?.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      const ghOrg = ghMatch?.[1]?.toLowerCase();
      const repoFullName = ghMatch ? `${ghMatch[1]}/${ghMatch[2].replace(/\.git$/, "")}` : null;

      // ── AUTO-REJECT rules (no API call needed) ──
      if (skill.security_status === "flagged") {
        const notes = (skill.security_notes || "").toLowerCase();
        if (notes.includes("archived") || notes.includes("not found") || notes.includes("disabled")) {
          shouldReject = true;
          rejectReason = `Flagged: ${skill.security_notes}`;
        }
      }

      const desc = (skill.description_human || "").trim();
      const autoGenPattern = /^[\w\s-]+ — AI agent skill from [\w/-]+$/i;
      const autoTaglinePattern = /skill for AI agents$/i;
      // Instead of rejecting, fix the description on the fly
      if (desc.length < 50 || autoGenPattern.test(desc)) {
        const betterDesc = `Specialized AI agent skill for ${skill.display_name}. Enhances your AI assistant with expert knowledge and capabilities for this domain.`;
        const betterTagline = `${skill.display_name} — professional AI agent skill`;
        await supabase.from("skills").update({
          description_human: betterDesc,
          tagline: betterTagline,
        }).eq("id", skill.id);
        // Continue to scoring instead of rejecting
      }

      // Only hard-reject if truly no description at all and no display name
      if (!desc && !skill.display_name) {
        shouldReject = true;
        rejectReason = "No description or display name";
      }

      if (shouldReject) {
        await supabase.from("skills").update({
          status: "rejected",
          auto_approved_reason: `auto-rejected: ${rejectReason}`,
        }).eq("id", skill.id);

        await supabase.from("automation_logs").insert({
          skill_id: skill.id,
          action_type: "auto_reject",
          function_name: "auto-approve-skills",
          reason: rejectReason,
          metadata: { slug: skill.slug, security_status: skill.security_status },
        });

        rejected++;
        continue;
      }

      // ── GITHUB PRE-CHECK (Layer 1 validation) ──
      // Every skill needs either a security_scan_result OR a passing GitHub pre-check
      const hasGithubUrl = !!skill.github_url && skill.github_url.startsWith("https://github.com/");

      if (!skill.security_scan_result && !hasGithubUrl) {
        // No GitHub URL and no scan = can't validate, skip
        skipped++;
        continue;
      }

      let ghCheck: GitHubCheck | null = null;

      // If no security_scan_result yet, we MUST do a GitHub pre-check before approving
      if (!skill.security_scan_result && repoFullName) {
        ghCheck = await quickGitHubCheck(repoFullName, ghHeaders);

        if (ghCheck === null) {
          // Rate limited or network error — stop making API calls
          rateLimited = true;
          skipped++;
          continue;
        }

        // ── Reject based on GitHub check ──
        if (!ghCheck.exists) {
          await supabase.from("skills").update({
            status: "rejected",
            security_status: "flagged",
            security_notes: "Repository not found (404)",
            auto_approved_reason: "auto-rejected: repo_not_found",
          }).eq("id", skill.id);

          await supabase.from("automation_logs").insert({
            skill_id: skill.id,
            action_type: "auto_reject",
            function_name: "auto-approve-skills",
            reason: "repo_not_found",
            metadata: { slug: skill.slug, github_url: skill.github_url },
          });
          rejected++;
          continue;
        }

        if (ghCheck.archived) {
          await supabase.from("skills").update({
            status: "rejected",
            security_status: "flagged",
            security_notes: "Repository is archived",
            auto_approved_reason: "auto-rejected: repo_archived",
          }).eq("id", skill.id);

          await supabase.from("automation_logs").insert({
            skill_id: skill.id,
            action_type: "auto_reject",
            function_name: "auto-approve-skills",
            reason: "repo_archived",
            metadata: { slug: skill.slug },
          });
          rejected++;
          continue;
        }

        if (ghCheck.disabled) {
          await supabase.from("skills").update({
            status: "rejected",
            security_status: "flagged",
            security_notes: "Repository is disabled",
            auto_approved_reason: "auto-rejected: repo_disabled",
          }).eq("id", skill.id);

          await supabase.from("automation_logs").insert({
            skill_id: skill.id,
            action_type: "auto_reject",
            function_name: "auto-approve-skills",
            reason: "repo_disabled",
            metadata: { slug: skill.slug },
          });
          rejected++;
          continue;
        }

        // Update stars and metadata from GitHub check
        const updateData: Record<string, unknown> = {
          security_status: "unverified",
          security_notes: [
            ghCheck.hasLicense ? "License: yes" : "No license",
            `Stars: ${ghCheck.stars}`,
            ghCheck.lastPushAt ? `Last push: ${ghCheck.lastPushAt.slice(0, 10)}` : "No push data",
          ].join("; "),
          security_checked_at: new Date().toISOString(),
        };
        if (ghCheck.stars > 0) updateData.github_stars = ghCheck.stars;
        if (ghCheck.lastPushAt) updateData.last_commit_at = ghCheck.lastPushAt;

        await supabase.from("skills").update(updateData).eq("id", skill.id);
      }

      // ── SCORING: collect approval signals ──

      // Rule 1: Trusted source (strong signal)
      if (ghOrg && TRUSTED_SOURCES.includes(ghOrg)) {
        reasons.push(`trusted_source:${ghOrg}`);
      }

      // Rule 2: Security already verified (strong signal)
      if (skill.security_status === "verified") {
        reasons.push("security_verified");
      }

      // Rule 3: GitHub stars (strong if >5, uses live data if available)
      const effectiveStars = ghCheck?.stars ?? skill.github_stars;
      if (effectiveStars > 5) {
        reasons.push(`github_stars:${effectiveStars}`);
      }

      // Rule 4: Has GitHub URL (weak signal)
      if (hasGithubUrl) {
        reasons.push("has_github_url");
      }

      // Rule 5: Created by platform user (weak signal)
      if (skill.creator_id) {
        reasons.push("platform_created");
      }

      // Rule 6: Has valid native install command — verify source exists (strong signal if verified)
      const cmd = skill.install_command || "";
      if (cmd.includes("claude skill add") || cmd.includes("raw.githubusercontent.com")) {
        // Try HEAD check on the raw URL to verify it's reachable
        const rawUrlMatch = cmd.match(/(https:\/\/raw\.githubusercontent\.com\/[^\s"']+)/);
        if (rawUrlMatch) {
          try {
            const headRes = await fetch(rawUrlMatch[1], { method: "HEAD" });
            if (headRes.ok) {
              reasons.push("verified_install_command");
            } else {
              // Install source 404 — don't count as signal
            }
          } catch {
            reasons.push("valid_install_command"); // Network error, give benefit of doubt
          }
        } else {
          reasons.push("valid_install_command");
        }
      }

      // Rule 7: GitHub pre-check passed with license (weak signal)
      if (ghCheck?.hasLicense) {
        reasons.push("has_license");
      }

      // Rule 8: Active repo — pushed within last 12 months (weak signal)
      if (ghCheck?.lastPushAt) {
        const monthsAgo = (Date.now() - new Date(ghCheck.lastPushAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo <= 12) {
          reasons.push("active_repo");
        }
      }

      // Rule 9: Has real README content (strong signal)
      if (skill.readme_raw && skill.readme_raw.length > 200) {
        reasons.push("has_real_readme");
      }

      // ── DECISION ──
      // Approve if: 2+ signals total AND at least 1 strong signal, OR 4+ weak signals
      // This is stricter to prevent low-quality items from being auto-approved
      const strongSignals = reasons.filter(r =>
        r.startsWith("trusted_source") || r === "security_verified" || r.startsWith("github_stars") || r === "has_real_readme" || r === "verified_install_command"
      );
      const shouldApprove = (strongSignals.length >= 1 && reasons.length >= 2) || reasons.length >= 4;

      if (shouldApprove) {
        await supabase.from("skills").update({
          status: "approved",
          auto_approved_reason: reasons.join(", "),
        }).eq("id", skill.id);

        await supabase.from("automation_logs").insert({
          skill_id: skill.id,
          action_type: "auto_approve",
          function_name: "auto-approve-skills",
          reason: reasons.join(", "),
          metadata: {
            slug: skill.slug,
            stars: effectiveStars,
            security: skill.security_status,
            gh_check: ghCheck ? { license: ghCheck.hasLicense, active: !!ghCheck.lastPushAt } : null,
          },
        });

        approved++;
      } else {
        skipped++;
      }
    }

    return new Response(JSON.stringify({
      processed: pending.length, approved, rejected, skipped,
      rate_limited: rateLimited,
      remaining: pending.length === batchSize ? "more" : 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-approve error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
