import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, ArrowRight, CheckCircle2, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function SyncError() {
  const [retrying, setRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState(0);
  const [recovered, setRecovered] = useState(false);
  const navigate = useNavigate();

  const handleRetry = () => {
    setRetrying(true);
    setRetryProgress(0);
    const interval = setInterval(() => {
      setRetryProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setRecovered(true);
          setTimeout(() => navigate("/processing"), 1500);
          return 100;
        }
        return p + 2;
      });
    }, 40);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {!recovered ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <motion.div
              animate={{ rotate: retrying ? [0, 10, -10, 0] : 0 }}
              transition={{ repeat: retrying ? Infinity : 0, duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto"
            >
              {retrying ? (
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              )}
            </motion.div>

            <div>
              <h1 className="font-display text-2xl font-bold">
                {retrying ? "Retrying sync…" : "Sync interrupted"}
              </h1>
              <p className="text-muted-foreground font-sans text-sm mt-2">
                {retrying
                  ? "Resuming from where we left off — your progress is saved"
                  : "We lost connection while importing your saved videos. Don't worry — 5 of 8 videos were already processed."}
              </p>
            </div>

            {retrying && <Progress value={retryProgress} className="h-2" />}

            {/* Partial progress indicator */}
            <div className="p-4 rounded-xl bg-secondary/50 text-left font-sans">
              <p className="text-sm font-semibold mb-2">Sync Progress</p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span className="text-muted-foreground">Video {i} — location extracted ✓</span>
                  </div>
                ))}
                {[6, 7, 8].map((i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {retrying ? (
                      <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Wifi className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-muted-foreground">Video {i} — {retrying ? "retrying…" : "pending"}</span>
                  </div>
                ))}
              </div>
            </div>

            {!retrying && (
              <div className="space-y-3">
                <Button onClick={handleRetry} size="lg" className="w-full gap-2 font-sans">
                  <RefreshCw className="w-4 h-4" /> Retry Sync
                </Button>
                <Button variant="outline" onClick={() => navigate("/processing")} className="w-full gap-2 font-sans">
                  Continue with 5 videos <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <h1 className="font-display text-2xl font-bold">All synced!</h1>
            <p className="text-muted-foreground font-sans text-sm">All 8 videos recovered. Continuing to processing…</p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
