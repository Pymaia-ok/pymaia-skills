import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  const links = [
    { to: "/explorar", label: t("nav.explore") },
    { to: "/primeros-pasos", label: t("nav.gettingStarted") },
    { to: "/mcp", label: t("nav.mcp") },
    { to: "/teams", label: t("nav.teams") },
    { to: "/publicar", label: t("nav.publish") },
  ];

  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm font-semibold tracking-tight">SkillHub</div>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SkillHub
        </div>
      </div>
    </footer>
  );
};

export default Footer;
