import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/logo.png";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "es" ? "en" : "es");
  };

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/explorar", label: t("nav.explore") },
    { to: "/mcp", label: t("nav.mcp") },
    { to: "/teams", label: t("nav.teams") },
    { to: "/primeros-pasos", label: t("nav.gettingStarted") },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 apple-blur border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logoImg} alt="Pymaia Skills" className="h-9 md:h-10 w-auto" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors ${
                location.pathname === link.to
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <button
            onClick={toggleLang}
            aria-label={t("nav.switchLang", { lang: i18n.language === "es" ? "EN" : "ES" })}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language === "es" ? "EN" : "ES"}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/publicar" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.publish")}
              </Link>
              <span className="text-sm text-muted-foreground">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </span>
              <button
                onClick={signOut}
                aria-label={t("nav.signOut")}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <User className="w-3.5 h-3.5" />
              {t("nav.signIn")}
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 apple-blur px-6 py-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm py-1 ${
                location.pathname === link.to ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-secondary text-muted-foreground"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language === "es" ? "EN" : "ES"}
          </button>
          {user ? (
            <>
              <Link to="/publicar" onClick={() => setMobileOpen(false)} className="block text-sm py-1 text-muted-foreground">
                {t("nav.publishSkill")}
              </Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-sm text-muted-foreground">
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-1">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      )}
    </motion.nav>
  );
};

export default Navbar;
