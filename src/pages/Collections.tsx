import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CollectionCard from "@/components/CollectionCard";
import { mockCollections } from "@/data/mockData";

export default function Collections() {
  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">Collections</h1>
            <p className="text-muted-foreground font-sans">Curated video collections for your trips</p>
          </div>
          <Button className="gap-2 font-sans">
            <Plus className="w-4 h-4" />
            New Collection
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {mockCollections.map((col, i) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <CollectionCard collection={col} />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
