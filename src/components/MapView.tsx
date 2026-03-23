import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockVideos } from "@/data/mockData";

const createIcon = (color: string) =>
  L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const coralIcon = createIcon("hsl(12, 76%, 61%)");

export default function MapView({ className = "" }: { className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { minZoom: 1 }).setView([30, 20], 2);
    mapInstance.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mockVideos.forEach((video) => {
      video.locations.forEach((loc) => {
        const marker = L.marker([loc.lat, loc.lng], { icon: coralIcon }).addTo(map);
        marker.bindPopup(`
          <div style="width:192px;font-family:sans-serif;">
            <img src="${video.thumbnail}" alt="${video.title}" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
            <h4 style="font-weight:600;font-size:14px;line-height:1.25;">${video.title}</h4>
            <p style="font-size:12px;color:#888;margin-top:4px;">@${video.creator}</p>
            <p style="font-size:12px;color:#888;">${loc.city}, ${loc.country}</p>
          </div>
        `);
      });
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className={`overflow-hidden h-full ${className}`}>
      <div ref={mapRef} className="w-full h-full min-h-0" />
    </div>
  );
}
