import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Users, Star, Zap } from "lucide-react";

const SocialProofBar = () => {
  const { t } = useTranslation();

  const proofs = [
    {
      icon: Users,
      text: t("landing.proofUsers"),
    },
    {
      icon: Zap,
      text: t("landing.proofTime"),
    },
    {
      icon: Star,
      text: t("landing.proofRating"),
    },
  ];

  return (
    <section className="py-10">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12"
        >
          {proofs.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <p.icon className="w-4 h-4" />
              <span>{p.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProofBar;
