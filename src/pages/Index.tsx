import { useQuery } from "@tanstack/react-query";
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

const Index = () => {
  const { data: skillsResult } = useQuery({
    queryKey: ["skills-all"],
    queryFn: () => fetchSkills({ sortBy: "rating" }),
  });
  const allSkills = skillsResult?.data ?? [];

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
