import { motion } from "framer-motion";
import { SearchX, MapPin, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const suggestedCities = [
  { city: "Barcelona", country: "Spain", emoji: "🇪🇸", count: 2400 },
  { city: "Tokyo", country: "Japan", emoji: "🇯🇵", count: 3100 },
  { city: "Paris", country: "France", emoji: "🇫🇷", count: 2800 },
  { city: "Bali", country: "Indonesia", emoji: "🇮🇩", count: 1900 },
];

export default function NoResults() {
  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto max-w-lg text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <SearchX className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">No Videos Yet</h1>
          <p className="text-muted-foreground font-sans">
            We don't have creator content for <strong>Reykjavik, Iceland</strong> yet — but we're growing fast!
          </p>
        </motion.div>

        {/* Request notification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl border border-primary/20 bg-primary/5 mb-8"
        >
          <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
          <h3 className="font-sans font-semibold text-sm mb-1">Get notified</h3>
          <p className="text-xs text-muted-foreground font-sans mb-3">We'll let you know when creators start posting about Reykjavik</p>
          <Button size="sm" className="font-sans text-xs">Notify Me</Button>
        </motion.div>

        {/* Suggestions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4 justify-center">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold">Trending Destinations</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {suggestedCities.map((c, i) => (
              <Link key={c.city} to="/onboarding">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="p-4 rounded-xl bg-card border border-border hover:shadow-card transition-shadow text-left"
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="font-sans font-semibold text-sm mt-2">{c.city}</p>
                  <p className="text-xs text-muted-foreground font-sans">{c.count.toLocaleString()} videos</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        <Link to="/explore">
          <Button variant="ghost" className="mt-6 gap-1 font-sans">
            Browse all destinations <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </main>
  );
}
