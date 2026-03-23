import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Compass, ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const VIDEO_PLACEHOLDER =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=600&fit=crop";

interface CollectionDetailData {
  collection: {
    id: string;
    name: string;
    description?: string | null;
    city?: string | null;
    country?: string | null;
    cover_image_url?: string | null;
    item_count: number;
  };
  items: Array<{
    id: string;
    video_id: string;
    position: number;
    video: {
      id: string;
      title?: string | null;
      thumbnail_url?: string | null;
      caption?: string | null;
      video_url?: string | null;
    } | null;
  }>;
}

async function fetchCollectionDetail(id: string): Promise<CollectionDetailData> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${API_URL}/api/collections/${id}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Collection not found");
    throw new Error("Failed to load collection");
  }
  return res.json();
}

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => fetchCollectionDetail(id!),
    enabled: !!id,
  });

  if (!id) {
    return (
      <main className="pt-20 pb-16 px-4 min-h-screen">
        <p className="text-muted-foreground font-sans">Missing collection id.</p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="pt-20 pb-16 px-4 min-h-screen">
        <p className="text-muted-foreground font-sans">Loading…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="pt-20 pb-16 px-4 min-h-screen">
        <p className="text-destructive font-sans">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <Button asChild variant="outline" className="mt-4 font-sans">
          <Link to="/collections">Back to collections</Link>
        </Button>
      </main>
    );
  }

  const { collection, items } = data;
  const hasVideos = items.length > 0;

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="gap-2 font-sans mb-4 -ml-2">
            <Link to="/collections">
              <ArrowLeft className="w-4 h-4" />
              Back to collections
            </Link>
          </Button>
          <h1 className="font-display text-4xl font-bold mb-2">{collection.name}</h1>
          {(collection.city || collection.country) && (
            <p className="text-muted-foreground font-sans mb-2">
              {[collection.city, collection.country].filter(Boolean).join(", ")}
            </p>
          )}
          {collection.description && (
            <p className="text-muted-foreground font-sans max-w-2xl">{collection.description}</p>
          )}
        </div>

        {!hasVideos && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-card border border-border text-center max-w-lg mx-auto"
          >
            <p className="font-display text-xl font-bold mb-2">No videos in this collection</p>
            <p className="text-muted-foreground font-sans mb-6">
              Explore and add videos to build your trip inspiration.
            </p>
            <Button asChild size="lg" className="gap-2 font-sans">
              <Link to="/explore">
                <Compass className="w-5 h-5" />
                Explore to add to collection
              </Link>
            </Button>
          </motion.div>
        )}

        {hasVideos && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl overflow-hidden bg-card shadow-card"
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={item.video?.thumbnail_url || VIDEO_PLACEHOLDER}
                      alt={item.video?.title || "Video"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="font-sans text-sm font-medium line-clamp-2">
                      {item.video?.title || "Untitled"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <Button asChild variant="outline" className="gap-2 font-sans">
              <Link to="/explore">
                <Compass className="w-4 h-4" />
                Explore to add to collection
              </Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
