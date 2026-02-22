import { motion } from "framer-motion";
import { ArrowRight, MapPin, Compass, Play, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VideoCard from "@/components/VideoCard";
import CollectionCard from "@/components/CollectionCard";
import { mockVideos, mockCollections, categories } from "@/data/mockData";
import heroBg from "@/assets/hero-bg.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function Index() {
  return (
    <main>
      {/* Hero */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img
          src={heroBg}
          alt="Travel destination"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/20 backdrop-blur-md border border-primary-foreground/20 text-primary-foreground text-sm">
              <Globe className="w-4 h-4" />
              Discover the world through short-form video
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-5xl md:text-7xl font-bold text-primary-foreground leading-[1.1] tracking-tight"
            >
              Travel starts with a <span className="text-gradient">Reel</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-primary-foreground/80 max-w-xl mx-auto font-sans"
            >
              Roamly maps travel videos from TikTok, Reels & more — so you can discover, save, and plan trips from the content you love.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-3 pt-2">
              <Link to="/explore">
                <Button size="lg" className="gap-2 font-sans text-base shadow-warm px-8">
                  <Compass className="w-5 h-5" />
                  Start Exploring
                </Button>
              </Link>
              <Link to="/map">
                <Button size="lg" variant="outline" className="gap-2 font-sans text-base bg-card/10 border-primary-foreground/30 text-primary-foreground hover:bg-card/20 px-8">
                  <MapPin className="w-5 h-5" />
                  Open Map
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl font-bold mb-8">Browse by Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card shadow-card hover:shadow-warm transition-shadow cursor-pointer group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
                <span className="text-sm font-medium text-center">{cat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Videos */}
      <section className="py-16 px-4 bg-secondary/40">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold">Trending Now</h2>
            <Link to="/explore">
              <Button variant="ghost" className="gap-1 font-sans">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {mockVideos.slice(0, 4).map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <VideoCard video={video} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold">Popular Collections</h2>
            <Link to="/collections">
              <Button variant="ghost" className="gap-1 font-sans">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {mockCollections.map((col, i) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <CollectionCard collection={col} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to plan your next adventure?
          </h2>
          <p className="text-primary-foreground/80 mb-8 font-sans text-lg">
            Join thousands of travelers discovering destinations through short-form video.
          </p>
          <Link to="/onboarding">
            <Button size="lg" variant="secondary" className="gap-2 font-sans text-base px-8 shadow-warm">
              <Play className="w-5 h-5" />
              Get Started — It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">Roamly</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Roamly. Discover the world, one reel at a time.</p>
        </div>
      </footer>
    </main>
  );
}
