import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsBar from "@/components/landing/StatsBar";
import TwoPathsSection from "@/components/landing/TwoPathsSection";
import WizardSection from "@/components/landing/WizardSection";
import PopularSkills from "@/components/landing/PopularSkills";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import { fetchSkills } from "@/lib/api";
import { useSEO } from "@/hooks/useSEO";

const Index = () => {
  const { t } = useTranslation();
  const { data: skillsResult } = useQuery({
    queryKey: ["skills-all"],
    queryFn: () => fetchSkills({ sortBy: "rating" }),
  });
  const allSkills = skillsResult?.data ?? [];

  useSEO({
    title: "Pymaia Skills — Give your Claude superpowers",
    description: "The #1 skill directory for Claude Code. Thousands of ready-to-install skills. In 2 minutes your AI can do things it couldn't before.",
    canonical: "https://pymaiaskills.lovable.app/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Pymaia Skills",
      url: "https://pymaiaskills.lovable.app",
      description: "The #1 skill directory for Claude Code",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://pymaiaskills.lovable.app/explorar?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <HeroSection />
        <HowItWorks />
        <StatsBar />
        <TwoPathsSection />
        <WizardSection allSkills={allSkills} />
        <PopularSkills />
        <BeforeAfterSection />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
