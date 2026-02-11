import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockVideos } from "@/data/mockData";
import type { Video } from "@/data/mockData";

// Fix default marker icons
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

function VideoPopup({ video }: { video: Video }) {
  return (
    <div className="w-48 font-sans">
      <img src={video.thumbnail} alt={video.title} className="w-full h-24 object-cover rounded-lg mb-2" />
      <h4 className="font-semibold text-sm leading-tight">{video.title}</h4>
      <p className="text-xs text-muted-foreground mt-1">@{video.creator}</p>
      <p className="text-xs text-muted-foreground">{video.locations[0]?.city}, {video.locations[0]?.country}</p>
    </div>
  );
}

export default function MapView({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden shadow-card ${className}`}>
      <MapContainer
        center={[30, 20]}
        zoom={2}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {mockVideos.map((video) =>
          video.locations.map((loc) => (
            <Marker key={`${video.id}-${loc.id}`} position={[loc.lat, loc.lng]} icon={coralIcon}>
              <Popup>
                <VideoPopup video={video} />
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
}
