import Footer from "@/components/landing/Footer";
import { useTranslation } from "react-i18next";

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">{t("terms.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("terms.lastUpdated")}</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6 [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1"
          dangerouslySetInnerHTML={{ __html: t("terms.content") }}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
