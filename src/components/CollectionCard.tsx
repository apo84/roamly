import { motion } from "framer-motion";
import { Folder, MapPin } from "lucide-react";
import type { Collection } from "@/data/mockData";

export default function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl overflow-hidden bg-card shadow-card cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={collection.coverImage}
          alt={collection.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-lg font-bold text-primary-foreground">{collection.name}</h3>
          <div className="flex items-center gap-2 text-primary-foreground/80 text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{collection.city}, {collection.country}</span>
          </div>
        </div>
      </div>
      <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Folder className="w-4 h-4" />
        <span>{collection.videoCount} videos</span>
      </div>
    </motion.div>
  );
}
