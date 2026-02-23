import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Plus, Navigation, Play, Heart, ExternalLink, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { barcelonaVideos, barcelonaLocations } from "@/data/barcelonaData";
import type { Video, Location } from "@/data/mockData";

const pinIcon = (active: boolean) =>
  L.divIcon({
    html: `<div style="background:${active ? "hsl(12,76%,61%)" : "hsl(174,60%,40%)"};width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

function VideoPanel({ video, location, onClose, onAdd }: { video: Video; location: Location; onClose: () => void; onAdd: () => void }) {
  const distances = ["0.3 km", "0.8 km", "1.2 km", "0.5 km", "1.8 km", "0.4 km", "3.1 km", "0.6 km"];
  const times = ["4 min", "10 min", "15 min", "6 min", "22 min", "5 min", "38 min", "8 min"];
  const idx = barcelonaLocations.indexOf(location);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="absolute top-0 right-0 w-full max-w-sm h-full bg-card z-[1000] shadow-xl border-l border-border overflow-y-auto"
    >
      <div className="relative">
        <img src={video.thumbnail} alt={video.title} className="w-full h-56 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-sans text-primary-foreground font-medium">Watch 15s vibe check</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-display text-xl font-bold">{video.title}</h3>
          <p className="text-sm text-muted-foreground font-sans mt-1">@{video.creator}</p>
        </div>

        <p className="text-sm font-sans text-foreground/80">{video.caption}</p>

        <div className="p-3 rounded-xl bg-secondary/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Navigation className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="font-sans">
            <p className="text-sm font-semibold">{distances[idx] || "0.5 km"} from your hotel</p>
            <p className="text-xs text-muted-foreground">{times[idx] || "6 min"} walking</p>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border">
          <p className="text-sm font-semibold font-sans">{location.name}</p>
          <p className="text-xs text-muted-foreground font-sans">{location.city}, {location.country}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-secondary font-sans capitalize">{location.type}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground font-sans">
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {(video.likes / 1000).toFixed(1)}K</span>
          <span>{(video.views / 1000).toFixed(0)}K views</span>
          <span className="capitalize">{video.platform}</span>
        </div>

        <Button onClick={onAdd} size="lg" className="w-full gap-2 font-sans">
          <Plus className="w-4 h-4" /> Add to Itinerary
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1 font-sans text-xs">
            <Heart className="w-3.5 h-3.5" /> Save
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1 font-sans text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> Open in {video.platform}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function TripMap() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [itinerary, setItinerary] = useState<number[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const selectedVideo = selectedIdx !== null ? barcelonaVideos[selectedIdx] : null;
  const selectedLocation = selectedIdx !== null ? barcelonaLocations[selectedIdx] : null;

  const addToItinerary = () => {
    if (selectedIdx !== null && !itinerary.includes(selectedIdx)) {
      setItinerary([...itinerary, selectedIdx]);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView([41.3874, 2.1686], 14);
    mapInstance.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; CARTO",
    }).addTo(map);

    const bounds = L.latLngBounds(barcelonaLocations.map((l) => [l.lat, l.lng]));
    map.fitBounds(bounds.pad(0.2));

    barcelonaVideos.forEach((video, i) => {
      const marker = L.marker([barcelonaLocations[i].lat, barcelonaLocations[i].lng], {
        icon: pinIcon(false),
      }).addTo(map);
      marker.on("click", () => setSelectedIdx(i));
      markersRef.current.push(marker);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
      markersRef.current = [];
    };
  }, []);

  // Update marker icons when selection/itinerary changes
  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      marker.setIcon(pinIcon(selectedIdx === i || itinerary.includes(i)));
    });
  }, [selectedIdx, itinerary]);

  return (
    <main className="pt-16 min-h-screen flex flex-col relative">
      <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} className="z-0" />

        {/* Itinerary bar */}
        {itinerary.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-4 left-4 right-4 z-[999] bg-card rounded-2xl shadow-warm border border-border p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                <span className="font-sans text-sm font-semibold">{itinerary.length} spots in itinerary</span>
              </div>
              <Link to="/itinerary">
                <Button size="sm" className="gap-1 font-sans text-xs">
                  View Itinerary <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {itinerary.map((idx) => (
                <img key={idx} src={barcelonaVideos[idx].thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ))}
            </div>
          </motion.div>
        )}

        {/* Side panel */}
        <AnimatePresence>
          {selectedVideo && selectedLocation && (
            <VideoPanel
              video={selectedVideo}
              location={selectedLocation}
              onClose={() => setSelectedIdx(null)}
              onAdd={addToItinerary}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
