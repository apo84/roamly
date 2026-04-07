import type { Video, Location } from "./mockData";

export const barcelonaLocations: Location[] = [
  { id: "bl1", name: "La Boqueria Market", city: "Barcelona", country: "Spain", lat: 41.3816, lng: 2.1719, type: "market" },
  { id: "bl2", name: "Park Güell", city: "Barcelona", country: "Spain", lat: 41.4145, lng: 2.1527, type: "park" },
  { id: "bl3", name: "Bar Cañete", city: "Barcelona", country: "Spain", lat: 41.3795, lng: 2.1711, type: "restaurant" },
  { id: "bl4", name: "Barceloneta Beach", city: "Barcelona", country: "Spain", lat: 41.3784, lng: 2.1925, type: "beach" },
  { id: "bl5", name: "Sagrada Família", city: "Barcelona", country: "Spain", lat: 41.4036, lng: 2.1744, type: "landmark" },
  { id: "bl6", name: "El Born Quarter", city: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1826, type: "landmark" },
  { id: "bl7", name: "Bunkers del Carmel", city: "Barcelona", country: "Spain", lat: 41.4185, lng: 2.1575, type: "landmark" },
  { id: "bl8", name: "Café de l'Acadèmia", city: "Barcelona", country: "Spain", lat: 41.3835, lng: 2.178, type: "cafe" },
];

export const barcelonaVideos: Video[] = [
  {
    id: "bv1",
    title: "La Boqueria food tour 🍇",
    thumbnail: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=600&fit=crop",
    caption: "Best food market in all of Europe! Fresh juices for €2 🧃",
    creator: "tapasqueen",
    creatorAvatar: "https://i.pravatar.cc/40?img=10",
    hashtags: ["#barcelona", "#laboqueria", "#foodmarket"],
    likes: 34200,
    views: 267000,
    platform: "tiktok",
    locations: [barcelonaLocations[0]],
    category: "food",
    createdAt: "2026-02-10",
  },
  {
    id: "bv2",
    title: "Park Güell sunrise hack ☀️",
    thumbnail: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=600&fit=crop",
    caption: "Get there at 7am for FREE entry and zero crowds",
    creator: "barcelona.gems",
    creatorAvatar: "https://i.pravatar.cc/40?img=11",
    hashtags: ["#parkguell", "#gaudi", "#barcelona"],
    likes: 56700,
    views: 430000,
    platform: "instagram",
    locations: [barcelonaLocations[1]],
    category: "attractions",
    createdAt: "2026-02-08",
  },
  {
    id: "bv3",
    title: "Best tapas in Gothic Quarter 🫒",
    thumbnail: "https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=400&h=600&fit=crop",
    caption: "Bar Cañete — locals only spot with incredible patatas bravas",
    creator: "foodieadventures",
    creatorAvatar: "https://i.pravatar.cc/40?img=2",
    hashtags: ["#tapas", "#barcelona", "#gothicquarter"],
    likes: 41800,
    views: 312000,
    platform: "tiktok",
    locations: [barcelonaLocations[2]],
    category: "food",
    createdAt: "2026-02-12",
  },
  {
    id: "bv4",
    title: "Barceloneta at golden hour 🌅",
    thumbnail: "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=400&h=600&fit=crop",
    caption: "This beach hits different when the sun goes down",
    creator: "sunsetseeker",
    creatorAvatar: "https://i.pravatar.cc/40?img=12",
    hashtags: ["#barceloneta", "#beach", "#goldenhour"],
    likes: 29500,
    views: 198000,
    platform: "instagram",
    locations: [barcelonaLocations[3]],
    category: "nature",
    createdAt: "2026-02-14",
  },
  {
    id: "bv5",
    title: "Sagrada Família interior is INSANE 🤯",
    thumbnail: "https://images.unsplash.com/photo-1583779457711-ab081de64105?w=400&h=600&fit=crop",
    caption: "Book the afternoon slot — the light through the stained glass is magical",
    creator: "architecturelover",
    creatorAvatar: "https://i.pravatar.cc/40?img=13",
    hashtags: ["#sagradafamilia", "#gaudi", "#barcelona"],
    likes: 89000,
    views: 670000,
    platform: "youtube",
    locations: [barcelonaLocations[4]],
    category: "culture",
    createdAt: "2026-02-06",
  },
  {
    id: "bv6",
    title: "El Born nightlife guide 🌃",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=600&fit=crop",
    caption: "Best cocktail bars and hidden speakeasies in El Born",
    creator: "nightowl.bcn",
    creatorAvatar: "https://i.pravatar.cc/40?img=14",
    hashtags: ["#elborn", "#nightlife", "#barcelona"],
    likes: 22300,
    views: 178000,
    platform: "tiktok",
    locations: [barcelonaLocations[5]],
    category: "nightlife",
    createdAt: "2026-02-15",
  },
  {
    id: "bv7",
    title: "Secret sunset spot 🔥",
    thumbnail: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=600&fit=crop",
    caption: "Bunkers del Carmel — BEST panoramic view of Barcelona, totally free!",
    creator: "barcelona.gems",
    creatorAvatar: "https://i.pravatar.cc/40?img=11",
    hashtags: ["#bunkersdelcarmel", "#sunset", "#hiddengem"],
    likes: 73400,
    views: 520000,
    platform: "tiktok",
    locations: [barcelonaLocations[6]],
    category: "adventure",
    createdAt: "2026-02-09",
  },
  {
    id: "bv8",
    title: "Cutest café in Barcelona ☕",
    thumbnail: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=600&fit=crop",
    caption: "Café de l'Acadèmia in Plaça Sant Just — best courtyard dining",
    creator: "cafecrawl",
    creatorAvatar: "https://i.pravatar.cc/40?img=15",
    hashtags: ["#cafe", "#barcelona", "#gothicquarter"],
    likes: 18900,
    views: 145000,
    platform: "instagram",
    locations: [barcelonaLocations[7]],
    category: "food",
    createdAt: "2026-02-13",
  },
];

export const curatedFeed = {
  title: "Top 50 Hidden Gems — Barcelona",
  description: "Curated by the Trove team from 2,400+ creator videos",
  videos: barcelonaVideos,
};

export interface ItineraryItem {
  id: string;
  video: Video;
  location: Location;
  addedAt: string;
  walkingDistance: string;
  walkingTime: string;
  order: number;
  checkedIn: boolean;
}

export interface PassportEntry {
  id: string;
  location: Location;
  video: Video;
  checkedInAt: string;
  photoUrl?: string;
  note?: string;
}

export const mockItinerary: ItineraryItem[] = [
  {
    id: "it1",
    video: barcelonaVideos[0],
    location: barcelonaLocations[0],
    addedAt: "2026-02-16",
    walkingDistance: "0.3 km",
    walkingTime: "4 min",
    order: 1,
    checkedIn: true,
  },
  {
    id: "it2",
    video: barcelonaVideos[2],
    location: barcelonaLocations[2],
    addedAt: "2026-02-16",
    walkingDistance: "0.8 km",
    walkingTime: "10 min",
    order: 2,
    checkedIn: true,
  },
  {
    id: "it3",
    video: barcelonaVideos[4],
    location: barcelonaLocations[4],
    addedAt: "2026-02-16",
    walkingDistance: "2.1 km",
    walkingTime: "26 min",
    order: 3,
    checkedIn: false,
  },
  {
    id: "it4",
    video: barcelonaVideos[6],
    location: barcelonaLocations[6],
    addedAt: "2026-02-16",
    walkingDistance: "3.5 km",
    walkingTime: "42 min",
    order: 4,
    checkedIn: false,
  },
];

export const mockPassport: PassportEntry[] = [
  {
    id: "pe1",
    location: barcelonaLocations[0],
    video: barcelonaVideos[0],
    checkedInAt: "2026-02-17T10:30:00",
    note: "Amazing fresh juice! Got the mango-passionfruit 🥭",
  },
  {
    id: "pe2",
    location: barcelonaLocations[2],
    video: barcelonaVideos[2],
    checkedInAt: "2026-02-17T13:15:00",
    note: "Patatas bravas were 10/10 🔥",
  },
  {
    id: "pe3",
    location: barcelonaLocations[3],
    video: barcelonaVideos[3],
    checkedInAt: "2026-02-17T16:45:00",
    note: "Perfect sunset at the beach 🌅",
  },
];
