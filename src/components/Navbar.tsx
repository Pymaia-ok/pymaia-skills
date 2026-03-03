import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/explorar", label: "Explorar" },
    { to: "/primeros-pasos", label: "Primeros pasos" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 apple-blur border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          SkillHub
        </Link>
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors hidden md:block ${
                location.pathname === link.to
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden md:block">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </span>
              <button
                onClick={signOut}
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
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
