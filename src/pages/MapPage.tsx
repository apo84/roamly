import { motion } from "framer-motion";
import MapView from "@/components/MapView";

export default function MapPage() {
  return (
    <main className="pt-16 min-h-screen flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1"
        style={{ minHeight: "calc(100vh - 4rem)" }}
      >
        <MapView className="w-full h-full rounded-none" />
      </motion.div>
    </main>
  );
}
