import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Menu, X, Globe, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/logo.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import GlobalSearch from "@/components/GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "es" ? "en" : "es");
  };

  const links = [
    { to: "/explorar", label: t("nav.explore") },
    { to: "/conectores", label: t("nav.connectors") },
    { to: "/plugins", label: t("nav.plugins") },
    { to: "/enterprise", label: "Enterprise" },
  ];

  const mobileLinks = [
    { to: "/explorar", label: t("nav.explore") },
    { to: "/conectores", label: t("nav.connectors") },
    { to: "/plugins", label: t("nav.plugins") },
    { to: "/enterprise", label: "Enterprise" },
    { to: "/primeros-pasos", label: t("nav.gettingStarted") },
    { to: "/mcp", label: "MCP Server" },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 apple-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Zone 1: Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <img src={logoImg} alt="Pymaia Skills" className="h-9 md:h-10 w-auto dark:brightness-0 dark:invert" />
        </Link>

        {/* Zone 2: Main nav + search (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to))
                  ? "text-foreground font-medium bg-secondary/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* GlobalSearch — renders desktop trigger (hidden md:flex) + mobile trigger (md:hidden) + dialog */}
        <div className="contents">
          <GlobalSearch />
        </div>

        {/* Zone 3: Actions (desktop) */}
        <div className="hidden md:flex items-center gap-2">

          <div className="w-px h-5 bg-border mx-1" />

          <ThemeToggle />

          <button
            onClick={toggleLang}
            aria-label={t("nav.switchLang", { lang: i18n.language === "es" ? "EN" : "ES" })}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language === "es" ? "EN" : "ES"}
          </button>

          <NotificationBell />

          <div className="w-px h-5 bg-border mx-1" />

          <Link
            to="/crear-skill"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("nav.createSkill")}
          </Link>

          {user ? (
            <>

              <div className="w-px h-5 bg-border mx-1" />

              <Link
                to="/mis-skills"
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-secondary/40 transition-colors"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                  {displayName}
                </span>
              </Link>

              <button
                onClick={signOut}
                aria-label={t("nav.signOut")}
                className="p-1.5 rounded-md hover:bg-secondary/40 transition-colors text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>

        {/* Mobile actions */}
        <div className="md:hidden flex items-center">
          <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 apple-blur px-6 py-4 space-y-3">
          {mobileLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm py-1.5 ${
                location.pathname === link.to ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="h-px bg-border my-2" />

          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-secondary text-muted-foreground"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language === "es" ? "EN" : "ES"}
          </button>

          <Link to="/crear-skill" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-sm py-1.5 text-muted-foreground">
            <Plus className="w-3.5 h-3.5" />
            {t("nav.createSkill")}
          </Link>

          {user ? (
            <>
              <Link to="/mis-skills" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm py-1.5 text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                {displayName}
              </Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-sm text-muted-foreground">
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-1.5">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
