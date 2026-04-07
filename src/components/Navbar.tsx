import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Compass, Heart, Map, Menu, X, Search, Award, Route, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/map", label: "Map", icon: Map },
  { to: "/collections", label: "Collections", icon: Heart },
  { to: "/itinerary", label: "Itinerary", icon: Route },
  { to: "/passport", label: "Passport", icon: Award },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, signOut } = useAuth();

  const handleSignInWithGoogle = async () => {
    const appUrl = import.meta.env.VITE_APP_URL as string | undefined;
    if (!appUrl) {
      // eslint-disable-next-line no-console
      console.error("Missing VITE_APP_URL. Set it in .env.local or Vercel env vars.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Trove
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to}>
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 font-sans"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="w-4 h-4" />
          </Button>
          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              className="font-sans gap-2"
              onClick={() => void signOut()}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          ) : (
            <Button variant="default" size="sm" className="font-sans" onClick={handleSignInWithGoogle}>
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-card border-b border-border"
          >
            <div className="p-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2 font-sans">
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  className="mt-2 font-sans gap-2"
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="mt-2 font-sans"
                  onClick={() => {
                    setMobileOpen(false);
                    void handleSignInWithGoogle();
                  }}
                >
                  Sign In
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
