import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, ExternalLink, Download, Route, ArrowUpDown, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockItinerary } from "@/data/barcelonaData";
import type { ItineraryItem } from "@/data/barcelonaData";

export default function Itinerary() {
  const [items] = useState<ItineraryItem[]>(mockItinerary);
  const [sortBy, setSortBy] = useState<"order" | "distance">("order");

  const sorted = [...items].sort((a, b) =>
    sortBy === "distance" ? parseFloat(a.walkingDistance) - parseFloat(b.walkingDistance) : a.order - b.order
  );

  const exportToGoogleMaps = () => {
    const waypoints = items.map((it) => `${it.location.lat},${it.location.lng}`);
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const stops = waypoints.slice(1, -1).join("|");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${stops}&travelmode=walking`;
    window.open(url, "_blank");
  };

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Route className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">Your Itinerary</h1>
              <p className="text-muted-foreground font-sans text-sm">Barcelona · {items.length} stops</p>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" className="gap-1 font-sans text-xs" onClick={() => setSortBy(s => s === "order" ? "distance" : "order")}>
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort by {sortBy === "order" ? "distance" : "order"}
          </Button>
          <Button onClick={exportToGoogleMaps} size="sm" className="gap-1 font-sans text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> Export to Google Maps
          </Button>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {sorted.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-4 p-4 rounded-2xl bg-card border border-border shadow-card"
            >
              <div className="relative flex-shrink-0">
                <img src={item.video.thumbnail} alt={item.video.title} className="w-20 h-20 rounded-xl object-cover" />
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center font-sans">
                  {item.order}
                </div>
              </div>
              <div className="flex-1 min-w-0 font-sans">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm truncate">{item.location.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{item.video.title}</p>
                  </div>
                  {item.checkedIn ? (
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-border flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {item.walkingDistance}</span>
                  <span>{item.walkingTime} walk</span>
                  <span className="capitalize px-1.5 py-0.5 rounded bg-secondary text-xs">{item.location.type}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Export CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center"
        >
          <Download className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold mb-1">Ready for your trip?</h3>
          <p className="text-sm text-muted-foreground font-sans mb-4">Export your custom walking route for offline use</p>
          <Button onClick={exportToGoogleMaps} size="lg" className="gap-2 font-sans">
            <MapPin className="w-4 h-4" /> Export to Google Maps
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
