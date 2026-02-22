import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Scan, Brain, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const steps = [
  { icon: Scan, label: "Scanning video captions…", detail: "Analyzing 8 videos for location mentions" },
  { icon: Brain, label: "Extracting locations with AI…", detail: "Identifying restaurants, landmarks & hidden gems" },
  { icon: MapPin, label: "Mapping coordinates…", detail: "Pinning 8 locations across Barcelona" },
  { icon: CheckCircle2, label: "All done!", detail: "Your interactive map is ready" },
];

export default function Processing() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate("/trip/barcelona"), 1200);
          return 100;
        }
        return p + 1.2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    if (progress < 25) setCurrentStep(0);
    else if (progress < 55) setCurrentStep(1);
    else if (progress < 85) setCurrentStep(2);
    else setCurrentStep(3);
  }, [progress]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Animated icon */}
        <motion.div
          animate={{ rotate: progress < 100 ? [0, 360] : 0, scale: progress >= 100 ? [1, 1.1, 1] : 1 }}
          transition={progress < 100 ? { repeat: Infinity, duration: 2, ease: "linear" } : { duration: 0.4 }}
          className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-8"
        >
          {progress >= 100 ? (
            <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
          ) : (
            <MapPin className="w-10 h-10 text-primary-foreground" />
          )}
        </motion.div>

        <h1 className="font-display text-2xl font-bold mb-2">Processing Locations</h1>
        <p className="text-muted-foreground font-sans text-sm mb-8">
          Hang tight — our AI is extracting locations from your videos
        </p>

        <Progress value={Math.min(progress, 100)} className="h-2 mb-8" />

        {/* Steps */}
        <div className="space-y-3 text-left">
          {steps.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isActive ? "bg-primary/5 border border-primary/20" : isDone ? "bg-secondary/50" : ""
                }`}
              >
                <step.icon className={`w-5 h-5 flex-shrink-0 ${isDone ? "text-accent" : isActive ? "text-primary" : "text-muted-foreground"}`} />
                <div className="font-sans">
                  <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Floating dots animation */}
        {progress < 100 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [-3, 3, -3] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                className="w-2 h-2 rounded-full bg-primary/40"
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
