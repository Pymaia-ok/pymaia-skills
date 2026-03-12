import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsBar from "@/components/landing/StatsBar";
import MarqueeSection from "@/components/landing/MarqueeSection";
import TwoPathsSection from "@/components/landing/TwoPathsSection";
import SkillCreatorSection from "@/components/landing/SkillCreatorSection";
import WizardSection from "@/components/landing/WizardSection";
import PopularSkills from "@/components/landing/PopularSkills";
import ConnectorsSection from "@/components/landing/ConnectorsSection";
import PluginsSection from "@/components/landing/PluginsSection";
import BundlesSection from "@/components/landing/BundlesSection";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import McpBannerSection from "@/components/landing/McpBannerSection";
import BlogSection from "@/components/landing/BlogSection";
import CreatorLeaderboard from "@/components/landing/CreatorLeaderboard";

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
    title: "Pymaia Skills — Potenciá tu equipo con inteligencia artificial",
    description: "35,000+ soluciones profesionales para tu asistente de IA. Activá soluciones para marketing, legal, finanzas, RRHH y más. Compatible con Claude, Manus, Cursor y más.",
    canonical: "https://pymaiaskills.lovable.app/",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "Pymaia Skills",
          url: "https://pymaiaskills.lovable.app",
          description: "The #1 AI solutions directory for businesses. 35,000+ professional solutions for Claude, Manus, Cursor, Antigravity, OpenClaw and more.",
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
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: "AI solutions directory, MCP Server, AI-powered search, Enterprise integrations, Solution builder",
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14">
        {/* 1. Hero — business hook + chat demo */}
        <HeroSection />
        {/* 2. Stats — credibility */}
        <StatsBar />
        {/* 3. Marquee — breadth */}
        <MarqueeSection />
        {/* 4. How it works — clarity */}
        <HowItWorks />
        {/* 5. Before/After — desire */}
        <BeforeAfterSection />
        {/* 6. Connectors — integrations */}
        <ConnectorsSection />
        {/* 7. Plugins — tools */}
        <PluginsSection />
        {/* 8. Popular solutions */}
        <PopularSkills />
        {/* 9. Wizard — discovery */}
        <WizardSection allSkills={allSkills} />
        {/* 10. Bundles by profession */}
        <BundlesSection />
        {/* 11. Two paths — meet user where they are */}
        <TwoPathsSection />
        {/* 12. Skill Creator */}
        <SkillCreatorSection />
        {/* 12b. Creator Leaderboard */}
        <CreatorLeaderboard />
        {/* 13. Blog / Articles */}
        <BlogSection />
        {/* 14. MCP banner */}
        <McpBannerSection />
        {/* 14. Final CTA */}
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
