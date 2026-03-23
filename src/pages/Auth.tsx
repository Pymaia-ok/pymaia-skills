import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

const Auth = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (user) return <Navigate to="/" replace />;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
    } catch {
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: t("auth.checkEmail"),
          description: t("auth.resetSent"),
        });
        setMode("login");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: t("auth.checkEmail"),
          description: t("auth.confirmSent"),
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-14 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <img src={logoImg} alt="Pymaia Skills" className="h-10 w-auto mb-6 dark:brightness-0 dark:invert" />
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              {mode === "forgot" ? t("auth.forgotTitle") : mode === "login" ? t("auth.title") : t("auth.signupTitle")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {mode === "forgot" ? t("auth.forgotSubtitle") : t("auth.subtitle")}
            </p>
          </div>

          {mode !== "forgot" && (
            <>
              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-border bg-background hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {t("auth.continueGoogle")}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">
                    {t("auth.orEmail")}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="sr-only">{t("auth.emailPlaceholder")}</label>
              <input
                id="auth-email"
                type="email"
                required
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <label htmlFor="auth-password" className="sr-only">{t("auth.passwordPlaceholder")}</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                : mode === "forgot"
                ? t("auth.forgotBtn")
                : mode === "login"
                ? t("auth.loginBtn")
                : t("auth.signupBtn")}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <>
                <button onClick={() => setMode("login")} className="underline hover:text-foreground transition-colors">
                  {t("auth.backToLogin")}
                </button>
              </>
            ) : mode === "login" ? (
              <>
                {t("auth.noAccount")}{" "}
                <button onClick={() => setMode("signup")} className="underline hover:text-foreground transition-colors">
                  {t("auth.signupLink")}
                </button>
                <span className="mx-2">·</span>
                <button onClick={() => setMode("forgot")} className="underline hover:text-foreground transition-colors">
                  {t("auth.forgotLink")}
                </button>
              </>
            ) : (
              <>
                {t("auth.hasAccount")}{" "}
                <button onClick={() => setMode("login")} className="underline hover:text-foreground transition-colors">
                  {t("auth.loginLink")}
                </button>
              </>
            )}
          </p>

          <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
            {t("auth.terms")}{" "}
            <a href="/terminos" className="underline hover:text-foreground transition-colors">
              {t("footer.terms")}
            </a>{" "}
            {t("auth.and")}{" "}
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
