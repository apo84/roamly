import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VideoCard from "@/components/VideoCard";
import { mockVideos, categories } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

export default function Explore() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = mockVideos.filter((v) => {
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase()) || v.caption.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || v.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">Explore Videos</h1>
          <p className="text-muted-foreground font-sans">Discover travel content from creators worldwide</p>
        </motion.div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search destinations, creators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-sans"
            />
          </div>
          <Button variant="outline" className="gap-2 font-sans">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap mb-8">
          <Badge
            variant={activeCategory === null ? "default" : "secondary"}
            className="cursor-pointer text-sm px-3 py-1"
            onClick={() => setActiveCategory(null)}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "secondary"}
              className="cursor-pointer text-sm px-3 py-1"
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            >
              {cat.emoji} {cat.label}
            </Badge>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <VideoCard video={video} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No videos found matching your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}
