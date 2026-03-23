import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import CollectionCard from "@/components/CollectionCard";
import type { Collection } from "@/data/mockData";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const COLLECTION_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop";

async function fetchCollections(): Promise<Collection[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(`${API_URL}/api/collections`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch collections");
  const json = await res.json();
  const list = json.collections ?? [];

  return list.map(
    (c: {
      id: string;
      name: string;
      city?: string | null;
      country?: string | null;
      cover_image_url?: string | null;
      item_count?: number;
    }): Collection => ({
      id: c.id,
      name: c.name,
      coverImage: c.cover_image_url || COLLECTION_PLACEHOLDER_IMAGE,
      videoCount: c.item_count ?? 0,
      city: c.city ?? "",
      country: c.country ?? "",
    }),
  );
}

export default function Collections() {
  const { data: collections = [], isLoading, error } = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });

  const isEmpty = collections.length === 0;

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">Collections</h1>
            <p className="text-muted-foreground font-sans">Curated video collections for your trips</p>
          </div>
          <Button asChild className="gap-2 font-sans">
            <Link to="/collections/new">
              <Plus className="w-4 h-4" />
              New Collection
            </Link>
          </Button>
        </motion.div>

        {isLoading && (
          <p className="text-muted-foreground font-sans">Loading collections…</p>
        )}

        {error && (
          <p className="text-destructive font-sans">Something went wrong. Try again later.</p>
        )}

        {!isLoading && !error && isEmpty && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground font-sans"
          >
            <Link to="/collections/new" className="text-primary hover:underline font-medium">
              Create a collection
            </Link>
          </motion.p>
        )}

        {!isLoading && !error && !isEmpty && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {collections.map((col, i) => (
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
        )}
      </div>
    </main>
  );
}
