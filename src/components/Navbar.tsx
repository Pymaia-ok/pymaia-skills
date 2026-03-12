import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Menu, X, Globe, Plus, Package, Bell, Moon, Sun, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import logoImg from "@/assets/logo.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import GlobalSearch from "@/components/GlobalSearch";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "es" ? "en" : "es");
  };

  const isDark = theme === "dark";

  // Listen for skill status changes for notification badge
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("nav-skill-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "skills", filter: `creator_id=eq.${user.id}` },
        (payload) => {
          const status = payload.new.status as string;
          if (status === "approved" || status === "rejected") {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const links = [
    { to: "/explorar", label: t("nav.explore") },
    { to: "/conectores", label: t("nav.connectors") },
    { to: "/plugins", label: t("nav.plugins") },
  ];

  const mobileLinks = [
    { to: "/explorar", label: t("nav.explore") },
    { to: "/conectores", label: t("nav.connectors") },
    { to: "/plugins", label: t("nav.plugins") },
    { to: "/primeros-pasos", label: t("nav.gettingStarted") },
    { to: "/mcp", label: "MCP Server" },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const initials = displayName.charAt(0).toUpperCase();
  const userEmail = user?.email || "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 apple-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <img src={logoImg} alt="Pymaia Skills" className="h-9 md:h-10 w-auto dark:brightness-0 dark:invert" />
        </Link>

        {/* Nav links (desktop) */}
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

        {/* Search */}
        <div className="contents">
          <GlobalSearch />
        </div>

        {/* Actions (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {user && (
            <Link
              to="/crear-skill"
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("nav.createSkill")}
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-secondary/40 transition-colors focus:outline-none">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/mis-skills")}>
                  <Package className="w-4 h-4 mr-2" />
                  {t("nav.mySkills")}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate("/enterprise")}>
                  <Building2 className="w-4 h-4 mr-2" />
                  {t("nav.enterprise")}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => { navigate("/mis-skills"); }}
                  className="relative"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {t("nav.notifications")}
                  {unreadCount > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </DropdownMenuItem>

                {/* Theme toggle */}
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer"
                >
                  {isDark ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
                  <span className="flex-1">{isDark ? t("nav.darkMode") : t("nav.lightMode")}</span>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    className="ml-2 scale-75"
                  />
                </DropdownMenuItem>

                {/* Language toggle */}
                <DropdownMenuItem onClick={toggleLang}>
                  <Globe className="w-4 h-4 mr-2" />
                  {t("nav.switchLang", { lang: i18n.language === "es" ? "EN" : "ES" })}
                  <span className="ml-auto text-xs text-muted-foreground font-medium">
                    {i18n.language === "es" ? "EN" : "ES"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <div className="w-px h-5 bg-border mx-1" />

              {/* Theme & lang for logged-out users */}
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={toggleLang}
                aria-label={t("nav.switchLang", { lang: i18n.language === "es" ? "EN" : "ES" })}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                {i18n.language === "es" ? "EN" : "ES"}
              </button>

              <Link
                to="/auth"
                className="flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                {t("nav.signIn")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile actions */}
        <div className="md:hidden flex items-center gap-1">
          <GlobalSearch />
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
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

          <Link to="/crear-skill" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-sm py-1.5 text-muted-foreground">
            <Plus className="w-3.5 h-3.5" />
            {t("nav.createSkill")}
          </Link>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-2 text-sm py-1.5 text-muted-foreground w-full"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? t("nav.lightMode") : t("nav.darkMode")}
          </button>

          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-secondary text-muted-foreground"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language === "es" ? "EN" : "ES"}
          </button>

          {user ? (
            <>
              <div className="h-px bg-border my-2" />
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
