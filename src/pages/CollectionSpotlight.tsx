import { motion } from "framer-motion";
import { ArrowLeft, FolderHeart, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { findCollectionById } from "@/data/passportStamps";
import { Button } from "@/components/ui/button";

export default function CollectionSpotlight() {
  const { id } = useParams<{ id: string }>();
  const collection = id ? findCollectionById(id) : undefined;

  if (!id) {
    return (
      <main className="pt-20 pb-16 px-4 min-h-screen">
        <p className="text-muted-foreground font-sans">Missing collection.</p>
      </main>
    );
  }

  if (!collection) {
    return (
      <main className="pt-20 pb-16 px-4 min-h-screen">
        <div className="container max-w-lg mx-auto text-center">
          <p className="font-display text-xl font-bold mb-2">Collection not in spotlight</p>
          <p className="text-muted-foreground font-sans mb-6">
            This ID isn&apos;t in the demo library. Open Collections for your saved lists.
          </p>
          <Button asChild>
            <Link to="/collections">Go to Collections</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="gap-2 font-sans mb-6 -ml-2">
          <Link to="/passport">
            <ArrowLeft className="w-4 h-4" />
            Back to Passport
          </Link>
        </Button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border border-border shadow-card bg-card">
          <div className="relative aspect-[16/9] sm:aspect-[2/1]">
            <img src={collection.coverImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <FolderHeart className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">{collection.name}</h1>
                <p className="text-sm text-muted-foreground font-sans flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {collection.city}, {collection.country}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground font-sans">
              {collection.videoCount} videos in this curated set. Explore to find more inspo for your next trip.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="font-sans">
                <Link to="/explore">Explore videos</Link>
              </Button>
              <Button asChild variant="outline" className="font-sans">
                <Link to="/collections">Your collections</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
