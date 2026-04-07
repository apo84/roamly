export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  caption: string;
  creator: string;
  creatorAvatar: string;
  hashtags: string[];
  likes: number;
  views: number;
  platform: "instagram" | "tiktok" | "youtube";
  locations: Location[];
  category: "food" | "nightlife" | "attractions" | "nature" | "culture" | "adventure";
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  type: "restaurant" | "landmark" | "cafe" | "hotel" | "beach" | "park" | "market";
}

export interface Collection {
  id: string;
  name: string;
  coverImage: string;
  videoCount: number;
  city: string;
  country: string;
}

export const mockLocations: Location[] = [
  { id: "l1", name: "Positano Beach", city: "Positano", country: "Italy", lat: 40.6281, lng: 14.485, type: "beach" },
  { id: "l2", name: "Tsukiji Outer Market", city: "Tokyo", country: "Japan", lat: 35.6654, lng: 139.7707, type: "market" },
  { id: "l3", name: "Sacré-Cœur", city: "Paris", country: "France", lat: 48.8867, lng: 2.3431, type: "landmark" },
  { id: "l4", name: "Café de Flore", city: "Paris", country: "France", lat: 48.854, lng: 2.3325, type: "cafe" },
  { id: "l5", name: "Shibuya Crossing", city: "Tokyo", country: "Japan", lat: 35.6595, lng: 139.7004, type: "landmark" },
  { id: "l6", name: "Santorini Sunset", city: "Oia", country: "Greece", lat: 36.4618, lng: 25.3753, type: "landmark" },
  { id: "l7", name: "Bali Rice Terraces", city: "Ubud", country: "Indonesia", lat: -8.4095, lng: 115.3126, type: "park" },
  { id: "l8", name: "Machu Picchu", city: "Cusco", country: "Peru", lat: -13.1631, lng: -72.545, type: "landmark" },
  { id: "l9", name: "Grand Bazaar", city: "Istanbul", country: "Turkey", lat: 41.0106, lng: 28.968, type: "market" },
  { id: "l10", name: "Marina Bay Sands", city: "Singapore", country: "Singapore", lat: 1.2834, lng: 103.8607, type: "hotel" },
];

export const mockVideos: Video[] = [
  {
    id: "v1",
    title: "Hidden gem in Positano 🇮🇹",
    thumbnail: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400&h=600&fit=crop",
    caption: "Found this secret beach spot in Positano! The views are unreal 🌊",
    creator: "travelwithsara",
    creatorAvatar: "https://i.pravatar.cc/40?img=1",
    hashtags: ["#positano", "#italy", "#amalficoast", "#travel"],
    likes: 24500,
    views: 189000,
    platform: "instagram",
    locations: [mockLocations[0]],
    category: "nature",
    createdAt: "2026-01-15",
  },
  {
    id: "v2",
    title: "Tokyo street food tour 🍣",
    thumbnail: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=600&fit=crop",
    caption: "Best sushi I've ever had at Tsukiji! Only $5 for this set 🤯",
    creator: "foodieadventures",
    creatorAvatar: "https://i.pravatar.cc/40?img=2",
    hashtags: ["#tokyo", "#japan", "#streetfood", "#sushi"],
    likes: 45200,
    views: 320000,
    platform: "tiktok",
    locations: [mockLocations[1], mockLocations[4]],
    category: "food",
    createdAt: "2026-01-20",
  },
  {
    id: "v3",
    title: "Paris at golden hour ✨",
    thumbnail: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=600&fit=crop",
    caption: "Montmartre is pure magic during sunset",
    creator: "wanderlust.co",
    creatorAvatar: "https://i.pravatar.cc/40?img=3",
    hashtags: ["#paris", "#france", "#goldenhour", "#montmartre"],
    likes: 31800,
    views: 245000,
    platform: "instagram",
    locations: [mockLocations[2], mockLocations[3]],
    category: "culture",
    createdAt: "2026-01-18",
  },
  {
    id: "v4",
    title: "Santorini sunsets hit different 🌅",
    thumbnail: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=600&fit=crop",
    caption: "Best sunset spot in Oia - get there early!",
    creator: "greekvibes",
    creatorAvatar: "https://i.pravatar.cc/40?img=4",
    hashtags: ["#santorini", "#greece", "#sunset", "#oia"],
    likes: 52000,
    views: 410000,
    platform: "tiktok",
    locations: [mockLocations[5]],
    category: "attractions",
    createdAt: "2026-02-01",
  },
  {
    id: "v5",
    title: "Bali rice terraces at sunrise 🌾",
    thumbnail: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=600&fit=crop",
    caption: "Tegallalang Rice Terrace at 6am - worth the early wake up",
    creator: "baliadventures",
    creatorAvatar: "https://i.pravatar.cc/40?img=5",
    hashtags: ["#bali", "#indonesia", "#riceterraces", "#ubud"],
    likes: 38900,
    views: 290000,
    platform: "instagram",
    locations: [mockLocations[6]],
    category: "nature",
    createdAt: "2026-01-25",
  },
  {
    id: "v6",
    title: "Machu Picchu guide 🏔️",
    thumbnail: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=600&fit=crop",
    caption: "Everything you need to know before visiting Machu Picchu",
    creator: "adventuretime",
    creatorAvatar: "https://i.pravatar.cc/40?img=6",
    hashtags: ["#machupicchu", "#peru", "#adventure", "#hiking"],
    likes: 67000,
    views: 520000,
    platform: "youtube",
    locations: [mockLocations[7]],
    category: "adventure",
    createdAt: "2026-02-05",
  },
  {
    id: "v7",
    title: "Istanbul Grand Bazaar 🛍️",
    thumbnail: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=600&fit=crop",
    caption: "How to shop like a local at the Grand Bazaar",
    creator: "turkishdelights",
    creatorAvatar: "https://i.pravatar.cc/40?img=7",
    hashtags: ["#istanbul", "#turkey", "#grandbazaar", "#shopping"],
    likes: 19800,
    views: 156000,
    platform: "tiktok",
    locations: [mockLocations[8]],
    category: "culture",
    createdAt: "2026-01-28",
  },
  {
    id: "v8",
    title: "Singapore skyline at night 🌃",
    thumbnail: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=600&fit=crop",
    caption: "Marina Bay Sands infinity pool - bucket list ✅",
    creator: "luxtravel",
    creatorAvatar: "https://i.pravatar.cc/40?img=8",
    hashtags: ["#singapore", "#marinabay", "#nightlife", "#luxury"],
    likes: 41300,
    views: 335000,
    platform: "instagram",
    locations: [mockLocations[9]],
    category: "nightlife",
    createdAt: "2026-02-03",
  },
];

export const mockCollections: Collection[] = [
  {
    id: "c1",
    name: "Tokyo 2026",
    coverImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
    videoCount: 12,
    city: "Tokyo",
    country: "Japan",
  },
  {
    id: "c2",
    name: "Paris Food Spots",
    coverImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
    videoCount: 8,
    city: "Paris",
    country: "France",
  },
  {
    id: "c3",
    name: "Bali Adventure",
    coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop",
    videoCount: 15,
    city: "Ubud",
    country: "Indonesia",
  },
  {
    id: "c4",
    name: "Mediterranean Summer",
    coverImage: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop",
    videoCount: 20,
    city: "Various",
    country: "Europe",
  },
];

export const categories = [
  { id: "food", label: "Food & Drink", emoji: "🍽️" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃" },
  { id: "attractions", label: "Attractions", emoji: "🏛️" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "culture", label: "Culture", emoji: "🎭" },
  { id: "adventure", label: "Adventure", emoji: "🏔️" },
] as const;
