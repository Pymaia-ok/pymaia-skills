import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const Teams = () => {
  const { t } = useTranslation();

  const tiers = [
    {
      name: t("teams.free"),
      price: "0",
      description: t("teams.freeDesc"),
      features: t("teams.freeFeatures", { returnObjects: true }) as string[],
      cta: t("teams.freeCta"),
      ctaLink: "/explorar",
      highlighted: false,
      priceUnit: t("teams.perMonth"),
    },
    {
      name: t("teams.pro"),
      price: "19",
      description: t("teams.proDesc"),
      features: t("teams.proFeatures", { returnObjects: true }) as string[],
      cta: t("teams.proCta"),
      ctaLink: "#",
      highlighted: false,
      priceUnit: t("teams.perMonth"),
    },
    {
      name: t("teams.teamsName"),
      price: "79",
      description: t("teams.teamsDesc"),
      features: t("teams.teamsFeatures", { returnObjects: true }) as string[],
      cta: t("teams.teamsCta"),
      ctaLink: "#",
      highlighted: true,
      priceUnit: t("teams.perTeam"),
    },
  ];

  const whyItems = [
    { title: t("teams.consistency"), desc: t("teams.consistencyDesc") },
    { title: t("teams.onboarding"), desc: t("teams.onboardingDesc") },
    { title: t("teams.control"), desc: t("teams.controlDesc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 max-w-5xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="hero-title mb-6 whitespace-pre-line">{t("teams.heroTitle")}</h1>
          <p className="hero-subtitle max-w-xl mx-auto">{t("teams.heroSubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {tiers.map((tier, i) => (
            <motion.div key={tier.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`p-8 rounded-2xl ${tier.highlighted ? "bg-foreground text-background" : "bg-secondary"}`}>
              <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
              <p className={`text-sm mb-6 ${tier.highlighted ? "text-background/70" : "text-muted-foreground"}`}>{tier.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className={`text-sm ${tier.highlighted ? "text-background/70" : "text-muted-foreground"}`}>{tier.priceUnit}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {(Array.isArray(tier.features) ? tier.features : []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlighted ? "text-background/70" : "text-muted-foreground"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={tier.ctaLink} className={`block w-full text-center py-3 rounded-full text-sm font-medium transition-opacity hover:opacity-90 ${tier.highlighted ? "bg-background text-foreground" : "bg-foreground text-background"}`}>
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center">
          <h2 className="text-2xl font-semibold mb-4">{t("teams.whyTitle")}</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {whyItems.map((item) => (
              <div key={item.title} className="p-6 rounded-2xl bg-secondary">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Teams;
