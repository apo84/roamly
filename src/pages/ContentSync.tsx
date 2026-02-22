import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, ArrowRight, Sparkles, BookmarkCheck, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { curatedFeed } from "@/data/barcelonaData";

export default function ContentSync() {
  const [selected, setSelected] = useState<"sync" | "curated" | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => navigate("/processing");

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold">Choose Your Content</h1>
          <p className="text-muted-foreground mt-2 font-sans">Barcelona — 2,400+ creator videos mapped</p>
        </motion.div>

        <div className="space-y-4">
          {/* Sync saves */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setSelected("sync")}
            className={`w-full p-5 rounded-2xl border text-left transition-all ${
              selected === "sync" ? "border-primary bg-primary/5 shadow-warm" : "border-border bg-card hover:shadow-card"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                <Instagram className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold font-sans text-lg">Sync Your Saves</h3>
                <p className="text-sm text-muted-foreground font-sans mt-1">
                  Import your saved Instagram Reels & TikToks — we'll extract every location automatically
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary font-sans">Instagram</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary font-sans">TikTok</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary font-sans">YouTube</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                selected === "sync" ? "border-primary bg-primary" : "border-border"
              }`}>
                {selected === "sync" && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
              </div>
            </div>
          </motion.button>

          {/* Curated feed */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setSelected("curated")}
            className={`w-full p-5 rounded-2xl border text-left transition-all ${
              selected === "curated" ? "border-primary bg-primary/5 shadow-warm" : "border-border bg-card hover:shadow-card"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral to-gold flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold font-sans text-lg">{curatedFeed.title}</h3>
                <p className="text-sm text-muted-foreground font-sans mt-1">{curatedFeed.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground font-sans">
                  <span className="flex items-center gap-1"><BookmarkCheck className="w-3.5 h-3.5" /> {curatedFeed.videos.length} videos</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Updated daily</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                selected === "curated" ? "border-primary bg-primary" : "border-border"
              }`}>
                {selected === "curated" && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
              </div>
            </div>
          </motion.button>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Button
            onClick={handleContinue}
            disabled={!selected}
            size="lg"
            className="w-full mt-8 gap-2 font-sans"
          >
            {selected === "sync" ? "Connect & Sync" : "Use Curated Feed"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
