import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsBar from "@/components/landing/StatsBar";
import MarqueeSection from "@/components/landing/MarqueeSection";
import TwoPathsSection from "@/components/landing/TwoPathsSection";
import WizardSection from "@/components/landing/WizardSection";
import PopularSkills from "@/components/landing/PopularSkills";
import ConnectorsSection from "@/components/landing/ConnectorsSection";
import BundlesSection from "@/components/landing/BundlesSection";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import McpBannerSection from "@/components/landing/McpBannerSection";
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
    title: "Pymaia Skills — Supercharge your work with AI",
    description: "The #1 skill directory for Claude Code. 38,000+ professional skills ready to install in 2 minutes. Give your Claude superpowers.",
    canonical: "https://pymaiaskills.lovable.app/",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "Pymaia Skills",
          url: "https://pymaiaskills.lovable.app",
          description: "The #1 skill directory for Claude Code. 38,000+ professional skills.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://pymaiaskills.lovable.app/explorar?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "Organization",
          name: "Pymaia",
          url: "https://pymaiaskills.lovable.app",
          logo: "https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png",
          contactPoint: {
            "@type": "ContactPoint",
            email: "info@pymaia.com",
            contactType: "customer service",
          },
        },
        {
          "@type": "WebApplication",
          name: "Pymaia Skills",
          url: "https://pymaiaskills.lovable.app",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: "Skill directory, MCP Server, AI-powered search, Connector catalog, Skill builder",
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        <HeroSection />
        <MarqueeSection />
        <HowItWorks />
        <StatsBar />
        <TwoPathsSection />
        <WizardSection allSkills={allSkills} />
        <PopularSkills />
        <ConnectorsSection />
        <BeforeAfterSection />
        <McpBannerSection />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
