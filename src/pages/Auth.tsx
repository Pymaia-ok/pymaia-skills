import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/logo.png";

const Auth = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleGoogleSignIn = async () => {
    await lovable.auth.signInWithOAuth("google");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center text-center mb-10">
            <img src={logoImg} alt="Pymaia Skills" className="h-12 w-auto mb-8" />
            <h1 className="text-2xl font-semibold tracking-tight mb-2">{t("auth.title")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("auth.subtitle")}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl border border-border bg-background hover:bg-secondary transition-colors text-sm font-medium shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t("auth.continueGoogle")}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground leading-relaxed">
            {t("auth.terms", "Al continuar, aceptás nuestros")}{" "}
            <a href="/terminos" className="underline hover:text-foreground transition-colors">
              {t("footer.terms")}
            </a>{" "}
            {t("auth.and", "y")}{" "}
            <a href="/privacidad" className="underline hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
