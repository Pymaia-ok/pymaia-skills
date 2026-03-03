import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Gratis",
    price: "0",
    description: "Para profesionales individuales",
    features: [
      "Acceso completo al directorio público",
      "Instalación de cualquier skill",
      "MCP Server básico",
      "Reviews y ratings",
    ],
    cta: "Empezar gratis",
    ctaLink: "/explorar",
    highlighted: false,
  },
  {
    name: "Pro Creador",
    price: "19",
    description: "Para creadores que quieren visibilidad",
    features: [
      "Todo lo del plan Gratis",
      "Analytics detallados de tus skills",
      "Badge 'Verified Creator'",
      "Prioridad en resultados de búsqueda",
      "Skills ilimitadas",
      "Responder reviews públicamente",
    ],
    cta: "Próximamente",
    ctaLink: "#",
    highlighted: false,
  },
  {
    name: "Teams",
    price: "79",
    priceUnit: "/equipo",
    description: "Para agencias y empresas",
    features: [
      "Todo lo del plan Pro",
      "Repositorio privado de skills internas",
      "Panel de gestión de equipo",
      "Instalación centralizada para todos",
      "MCP configurado para el equipo",
      "Onboarding guiado para nuevos miembros",
      "Soporte prioritario",
    ],
    cta: "Contactar ventas",
    ctaLink: "#",
    highlighted: true,
  },
];

const Teams = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-14 max-w-5xl mx-auto px-6 py-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <h1 className="hero-title mb-6">Skills para<br />todo tu equipo.</h1>
        <p className="hero-subtitle max-w-xl mx-auto">
          Estandarizá el uso de IA en tu agencia o empresa. Un panel, todas las skills, todo el equipo alineado.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 mb-20">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-8 rounded-2xl ${tier.highlighted ? "bg-foreground text-background" : "bg-secondary"}`}
          >
            <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
            <p className={`text-sm mb-6 ${tier.highlighted ? "text-background/70" : "text-muted-foreground"}`}>
              {tier.description}
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold">${tier.price}</span>
              <span className={`text-sm ${tier.highlighted ? "text-background/70" : "text-muted-foreground"}`}>
                {tier.priceUnit || "/mes"}
              </span>
            </div>
            <ul className="space-y-3 mb-8">
              {tier.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlighted ? "text-background/70" : "text-muted-foreground"}`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to={tier.ctaLink}
              className={`block w-full text-center py-3 rounded-full text-sm font-medium transition-opacity hover:opacity-90 ${
                tier.highlighted
                  ? "bg-background text-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              {tier.cta}
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center">
        <h2 className="text-2xl font-semibold mb-4">¿Por qué Teams?</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {[
            { title: "Consistencia", desc: "Todos usan las mismas skills con los mismos estándares de calidad." },
            { title: "Onboarding rápido", desc: "Nuevos miembros del equipo productivos con IA desde el día uno." },
            { title: "Control centralizado", desc: "Sabé quién tiene qué instalado y gestiona todo desde un panel." },
          ].map(item => (
            <div key={item.title} className="p-6 rounded-2xl bg-secondary">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </div>
);

export default Teams;
