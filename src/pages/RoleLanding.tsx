import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, FileArchive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { fetchBundle, fetchAllBundles, trackInstallation } from "@/lib/api";
import type { BundleFromDB } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import SkillCard from "@/components/SkillCard";
import EmailGateDialog from "@/components/EmailGateDialog";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

const roleIcons: Record<string, string> = {
  marketer: "📣", abogado: "⚖️", consultor: "💼", founder: "🚀", disenador: "🎨",
  ingeniero: "🔧", arquitecto: "🏗️", medico: "🩺", profesor: "🎓", otro: "✨",
};

const RoleLanding = () => {
  const { roleSlug } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [zipping, setZipping] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["bundle", roleSlug],
    queryFn: () => fetchBundle(roleSlug || ""),
    enabled: !!roleSlug,
  });

  const { data: allBundles = [] } = useQuery({
    queryKey: ["bundles-all"],
    queryFn: fetchAllBundles,
  });

  const bundle = data?.bundle;
  const skills = data?.skills ?? [];

  const title = bundle
    ? (i18n.language === "es" && bundle.title_es ? bundle.title_es : bundle.title)
    : "";
  const description = bundle
    ? (i18n.language === "es" && bundle.description_es ? bundle.description_es : bundle.description)
    : "";
  const roleLabel = bundle ? t(`roles.${bundle.role_slug}.label`, title) : "";

  useSEO({
    title: bundle ? `${t("roleLanding.heroPrefix")} ${roleLabel} — Pymaia Skills` : "Loading...",
    description: bundle ? description : "",
    canonical: bundle ? `https://pymaiaskills.lovable.app/para/${bundle.role_slug}` : "",
    jsonLd: bundle && skills.length > 0 ? {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${t("roleLanding.heroPrefix")} ${roleLabel}`,
      description,
      url: `https://pymaiaskills.lovable.app/para/${bundle.role_slug}`,
      numberOfItems: skills.length,
      itemListElement: skills.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://pymaiaskills.lovable.app/skill/${s.slug}`,
        name: s.display_name,
      })),
    } : undefined,
  });

  const performBulkZip = async () => {
    if (skills.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const folderName = `pymaia-pack-${roleSlug}`;
      skills.forEach((skill) => {
        const name = skill.slug || skill.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        zip.file(`${folderName}/${name}/SKILL.md`, skill.install_command);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("roleLanding.zipReady"));
      // Track installations
      if (user) {
        skills.forEach((s) => trackInstallation(s.id, user.id).catch(() => {}));
      }
    } catch {
      toast.error("Error generating ZIP");
    }
    setZipping(false);
  };

  const handleInstallAll = () => {
    if (user) {
      performBulkZip();
    } else {
      setShowEmailGate(true);
    }
  };

  const handleEmailCaptured = () => {
    performBulkZip();
    toast.success(t("emailGate.success", "¡Listo!"));
  };

  const otherBundles = allBundles.filter((b) => b.role_slug !== roleSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-5xl mx-auto px-6 py-24">
          <div className="h-12 w-64 bg-secondary rounded animate-pulse mb-4" />
          <div className="h-6 w-96 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14 max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">{t("roleLanding.notFound")}</h1>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← {t("roleLanding.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        {/* Hero */}
        <section className="py-20 md:py-28">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> {t("roleLanding.backHome")}
            </Link>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-6xl mb-6 block">{bundle.hero_emoji || roleIcons[bundle.role_slug] || "📦"}</span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                {t("roleLanding.heroPrefix")} {roleLabel}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                {description}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  className="rounded-full gap-2"
                  onClick={handleInstallAll}
                  disabled={zipping}
                >
                  <FileArchive className="w-5 h-5" />
                  {zipping ? t("roleLanding.downloading") : t("roleLanding.installAll")}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full gap-2"
                  asChild
                >
                  <Link to={`/explorar?roles=${bundle.role_slug}`}>
                    {t("roleLanding.browseIndividual")} <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {skills.length} {t("roleLanding.skillsIncluded")}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Skills Grid */}
        <section className="py-16 bg-secondary/30">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill, i) => (
                <SkillCard key={skill.id} skill={skill} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Other Packs */}
        {otherBundles.length > 0 && (
          <section className="py-20">
            <div className="max-w-5xl mx-auto px-6">
              <h2 className="text-2xl font-semibold text-center mb-10">
                {t("roleLanding.otherRoles")}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {otherBundles.map((b) => {
                  const bTitle = i18n.language === "es" && b.title_es ? b.title_es : b.title;
                  return (
                    <Link
                      key={b.id}
                      to={`/para/${b.role_slug}`}
                      className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-secondary hover:bg-accent transition-colors text-center group"
                    >
                      <span className="text-3xl">{b.hero_emoji || roleIcons[b.role_slug] || "📦"}</span>
                      <span className="text-sm font-semibold">{bTitle}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.skill_slugs.length} skills
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>

      {/* Email Gate for non-auth users */}
      {showEmailGate && skills.length > 0 && (
        <EmailGateDialog
          open={showEmailGate}
          onOpenChange={setShowEmailGate}
          skillId={skills[0].id}
          skillName={title}
          skillSlug={roleSlug || ""}
          onEmailCaptured={handleEmailCaptured}
        />
      )}
    </div>
  );
};

export default RoleLanding;
