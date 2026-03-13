import { Link } from "react-router-dom";
import { Star, Clock, Heart, ExternalLink, User, Lock, Activity, CheckCircle2 } from "lucide-react";
import { TrustBadge, ScannedByPymaiaBadge } from "@/components/TrustBadge";
import SecurityPanel from "@/components/SecurityPanel";
import SecurityReportButton from "@/components/SecurityReportButton";
import ShareButton from "@/components/ShareButton";
import { useTranslation } from "react-i18next";

interface SkillSidebarProps {
  skill: any;
  creatorProfile: any;
}

export default function SkillSidebar({ skill, creatorProfile }: SkillSidebarProps) {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const displayName = (isEs && skill.display_name_es) ? skill.display_name_es : skill.display_name;
  const tagline = (isEs && skill.tagline_es) ? skill.tagline_es : skill.tagline;

  return (
    <div className="space-y-6 order-1 lg:order-none lg:sticky lg:top-20 lg:self-start">
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <TrustBadge trustScore={skill.trust_score || 0} securityStatus={skill.security_status} scanResult={skill.security_scan_result} showWarnings itemType="skill" createdAt={skill.created_at} isOfficial={false} creatorId={skill.creator_id} isStale={skill.is_stale} isVerifiedPublisher={creatorProfile?.is_verified_publisher} />
          {skill.security_scanned_at && <ScannedByPymaiaBadge />}
        </div>

        {skill.quality_score != null && skill.quality_score > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
              skill.quality_score >= 75 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
              skill.quality_score >= 50 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
              "bg-muted text-muted-foreground"
            }`}>
              {skill.quality_score}
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">{isEs ? "Quality Score" : "Quality Score"}</div>
              <div className="text-[10px] text-muted-foreground">{isEs ? "Trust + evals + comunidad + docs + frescura" : "Trust + evals + community + docs + freshness"}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {skill.review_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="w-4 h-4 fill-foreground text-foreground" />
              <span className="font-medium text-foreground">{Number(skill.avg_rating).toFixed(1)}</span>
              <span className="text-muted-foreground">({skill.review_count})</span>
            </div>
          )}
          {skill.github_stars > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Heart className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{skill.github_stars.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{skill.time_to_install_minutes} {t("detail.minToInstall")}</span>
          </div>
          {skill.last_commit_at && (() => {
            const months = (Date.now() - new Date(skill.last_commit_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return months <= 6 ? (
              <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <Activity className="w-4 h-4" />
                <span>{t("trust.active", "Active")}</span>
              </div>
            ) : null;
          })()}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          {creatorProfile && (
            <Link to={creatorProfile.username ? `/u/${creatorProfile.username}` : "#"} className="flex items-center gap-2 text-sm hover:text-foreground transition-colors text-muted-foreground">
              {creatorProfile.avatar_url ? <img src={creatorProfile.avatar_url} alt="" className="w-5 h-5 rounded-full" /> : <User className="w-4 h-4" />}
              <span>{creatorProfile.display_name || creatorProfile.username || t("detail.author")}</span>
              {creatorProfile.is_verified_publisher && <span className="text-primary text-xs">✅</span>}
            </Link>
          )}
          {skill.github_url && (
            <a href={skill.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="w-4 h-4" /><span>{t("detail.viewRepo")}</span>
            </a>
          )}
          {!skill.is_public && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <Lock className="w-4 h-4" />
              <span className="text-xs font-medium">{t("detail.privateSkill", "Skill privada")}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 flex flex-wrap items-center gap-2">
          <SecurityReportButton itemType="skill" itemId={skill.id} itemSlug={skill.slug} />
          <ShareButton
            url={(() => {
              const base = `https://pymaiaskills.lovable.app/skill/${skill.slug}`;
              return skill.is_public === false && skill.share_token ? `${base}?token=${skill.share_token}` : base;
            })()}
            title={displayName}
            description={tagline}
          />
        </div>
      </div>

      <SecurityPanel
        trustScore={skill.trust_score || 0}
        securityStatus={skill.security_status}
        securityScannedAt={skill.security_scanned_at}
        scanResult={skill.security_scan_result}
        createdAt={skill.created_at}
        isOfficial={false}
        creatorId={skill.creator_id}
        creatorName={creatorProfile?.display_name}
        creatorUsername={creatorProfile?.username}
        creatorAvatarUrl={creatorProfile?.avatar_url}
        lastCommitAt={skill.last_commit_at}
        itemType="skill"
      />

      <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{isEs ? "Categoría" : "Category"}</div>
        <span className="text-sm text-foreground capitalize">{String(t(`categories.${skill.category}`, skill.category))}</span>
        {skill.target_roles?.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-3">{isEs ? "Para" : "For"}</div>
            <div className="flex flex-wrap gap-1.5">
              {skill.target_roles.map((r: string) => (
                <span key={r} className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{r}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
