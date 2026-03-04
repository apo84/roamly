import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, ArrowRight, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const destinations = [
  { city: "Barcelona", country: "Spain", emoji: "🇪🇸", videos: 2400 },
  { city: "Tokyo", country: "Japan", emoji: "🇯🇵", videos: 3100 },
  { city: "Paris", country: "France", emoji: "🇫🇷", videos: 2800 },
  { city: "Bali", country: "Indonesia", emoji: "🇮🇩", videos: 1900 },
  { city: "Istanbul", country: "Turkey", emoji: "🇹🇷", videos: 1200 },
  { city: "New York", country: "USA", emoji: "🇺🇸", videos: 4200 },
];

export default function Onboarding() {
  const [step, setStep] = useState<"auth" | "destination" | "dates">("auth");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [dates, setDates] = useState({ from: "", to: "" });
  const navigate = useNavigate();

  const handleSignIn = () => setStep("destination");
  const handleDestination = (city: string) => {
    setSelectedCity(city);
    setStep("dates");
  };
  const handleContinue = () => navigate("/sync");

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "auth" && (
            <motion.div key="auth" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="font-display text-3xl font-bold">Welcome to Trove</h1>
                <p className="text-muted-foreground mt-2 font-sans">Discover destinations through short-form video</p>
              </div>

              <button onClick={handleSignIn} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors font-sans">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                <span className="flex-1 text-left font-medium">Continue with Google</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <button onClick={handleSignIn} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors font-sans">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.33-3.74 4.25z"/></svg>
                <span className="flex-1 text-left font-medium">Continue with Apple</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-background px-3 text-muted-foreground font-sans">or</span></div>
              </div>

              <button onClick={handleSignIn} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-sans font-medium hover:bg-primary/90 transition-colors">
                Sign up with email
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === "destination" && (
            <motion.div key="destination" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="font-display text-2xl font-bold">Where are you headed?</h2>
                <p className="text-muted-foreground mt-1 font-sans text-sm">We'll find the best creator content for your trip</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {destinations.map((d) => (
                  <button
                    key={d.city}
                    onClick={() => handleDestination(d.city)}
                    className={`p-4 rounded-xl border text-left transition-all hover:shadow-card font-sans ${
                      selectedCity === d.city ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl">{d.emoji}</span>
                    <p className="font-semibold mt-2">{d.city}</p>
                    <p className="text-xs text-muted-foreground">{d.videos.toLocaleString()} videos</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "dates" && (
            <motion.div key="dates" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="font-display text-2xl font-bold">When's the trip?</h2>
                <p className="text-muted-foreground mt-1 font-sans text-sm">
                  <span className="text-2xl mr-1">{destinations.find(d => d.city === selectedCity)?.emoji}</span>
                  {selectedCity}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium font-sans mb-1.5 block">Arriving</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="date" value={dates.from} onChange={(e) => setDates(d => ({ ...d, from: e.target.value }))} className="pl-10 font-sans" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium font-sans mb-1.5 block">Departing</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="date" value={dates.to} onChange={(e) => setDates(d => ({ ...d, to: e.target.value }))} className="pl-10 font-sans" />
                  </div>
                </div>
              </div>
              <Button onClick={handleContinue} className="w-full gap-2 font-sans" size="lg">
                Find Videos <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {["auth", "destination", "dates"].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-8 bg-primary" : "w-2 bg-border"}`} />
          ))}
        </div>
      </div>
    </main>
  );
}
