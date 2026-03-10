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
import PluginsSection from "@/components/landing/PluginsSection";
import BundlesSection from "@/components/landing/BundlesSection";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import McpBannerSection from "@/components/landing/McpBannerSection";
import SocialProofBar from "@/components/landing/SocialProofBar";
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
    title: "Pymaia Skills — Trabajá como un experto en minutos",
    description: "Elegí una skill, instalala en Claude y convertite en experto. 38,000+ skills profesionales para marketing, legal, finanzas y más.",
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
        {/* 1. Hero — emotional hook + terminal demo */}
        <HeroSection />
        {/* 2. Social proof — quick trust signals */}
        <SocialProofBar />
        {/* 3. Marquee — visual energy, shows breadth */}
        <MarqueeSection />
        {/* 4. Stats — hard numbers */}
        <StatsBar />
        {/* 5. How it works — clarity */}
        <HowItWorks />
        {/* 6. Before/After — create desire */}
        <BeforeAfterSection />
        {/* 7. Popular skills — show the product */}
        <PopularSkills />
        {/* 8. Wizard — interactive discovery */}
        <WizardSection allSkills={allSkills} />
        {/* 9. Two paths — meet user where they are */}
        <TwoPathsSection />
        {/* 10. Bundles by profession */}
        <BundlesSection />
        {/* 11. Connectors */}
        <ConnectorsSection />
        {/* 12. Plugins */}
        <PluginsSection />
        {/* 13. MCP banner */}
        <McpBannerSection />
        {/* 14. Final CTA */}
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
