import { motion } from "framer-motion";

interface RoleCardProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

const RoleCard = ({ icon, label, description, onClick }: RoleCardProps) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-secondary hover:bg-accent transition-colors cursor-pointer text-center group"
  >
    <span className="text-4xl">{icon}</span>
    <span className="text-lg font-semibold text-foreground">{label}</span>
    <span className="text-sm text-muted-foreground">{description}</span>
  </motion.button>
);

export default RoleCard;
