import { useState } from "react";
import { motion } from "framer-motion";
import { Award, MapPin, Share2, CheckCircle2, Globe, Camera, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockPassport, barcelonaLocations, barcelonaVideos } from "@/data/barcelonaData";
import { Progress } from "@/components/ui/progress";

export default function Passport() {
  const [showShareToast, setShowShareToast] = useState(false);
  const totalLocations = barcelonaLocations.length;
  const checkedIn = mockPassport.length;
  const progress = (checkedIn / totalLocations) * 100;

  const handleShare = () => {
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coral to-gold flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Digital Passport</h1>
          <p className="text-muted-foreground font-sans mt-1">Your personal map of discovered gems</p>
        </motion.div>

        {/* Stats card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-card border border-border shadow-card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground font-sans">Barcelona Explorer</p>
              <p className="text-2xl font-bold font-display">{checkedIn} / {totalLocations} <span className="text-base font-normal text-muted-foreground">gems found</span></p>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-primary flex items-center justify-center">
              <span className="font-sans font-bold text-lg text-primary">{Math.round(progress)}%</span>
            </div>
          </div>
          <Progress value={progress} className="h-2 mb-3" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> 1 city</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {checkedIn} check-ins</span>
            <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> {checkedIn} moments</span>
          </div>
        </motion.div>

        {/* Share button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-6">
          <Button onClick={handleShare} variant="outline" className="w-full gap-2 font-sans">
            <Share2 className="w-4 h-4" /> Share Your Passport
          </Button>
          {showShareToast && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm text-accent font-sans mt-2">
              ✓ Share link copied to clipboard!
            </motion.p>
          )}
        </motion.div>

        {/* Check-in feed */}
        <h2 className="font-display text-xl font-bold mb-4">Your Journey</h2>
        <div className="space-y-4">
          {mockPassport.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4"
            >
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-accent-foreground" />
                </div>
                {i < mockPassport.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="p-4 rounded-2xl bg-card border border-border shadow-card">
                  <div className="flex items-start gap-3">
                    <img src={entry.video.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0 font-sans">
                      <h3 className="font-semibold text-sm">{entry.location.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.checkedInAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  {entry.note && (
                    <div className="mt-3 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-sans">{entry.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Unchecked locations */}
        <h2 className="font-display text-xl font-bold mt-8 mb-4">Still to Discover</h2>
        <div className="grid grid-cols-2 gap-3">
          {barcelonaLocations
            .filter((loc) => !mockPassport.some((p) => p.location.id === loc.id))
            .map((loc, i) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="p-3 rounded-xl border border-dashed border-border bg-card/50 font-sans"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{loc.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{loc.type}</p>
              </motion.div>
            ))}
        </div>
      </div>
    </main>
  );
}
