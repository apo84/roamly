import { motion } from "framer-motion";
import { Heart, Eye, MapPin, Play } from "lucide-react";
import type { Video } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-r from-pink-500 to-orange-400",
  tiktok: "bg-foreground",
  youtube: "bg-red-600",
};

export default function VideoCard({ video }: { video: Video }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl overflow-hidden bg-card shadow-card cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          </div>
        </div>

        {/* Platform badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold text-primary-foreground ${platformColors[video.platform]}`}>
            {video.platform}
          </span>
        </div>

        {/* Stats */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-primary-foreground text-xs font-medium">
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{formatNumber(video.likes)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatNumber(video.views)}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-display text-base font-semibold leading-tight line-clamp-1">{video.title}</h3>
        <div className="flex items-center gap-2">
          <img src={video.creatorAvatar} alt={video.creator} className="w-5 h-5 rounded-full" />
          <span className="text-sm text-muted-foreground">@{video.creator}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 text-primary" />
          <span>{video.locations[0]?.city}, {video.locations[0]?.country}</span>
        </div>
        <div className="flex gap-1 flex-wrap pt-1">
          {video.hashtags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
