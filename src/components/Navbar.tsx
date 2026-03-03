import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Compass, Heart, Map, Menu, X, Search, Award, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

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

  const handleSignInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:8080/auth/callback",
      },
    });
  };

  const handleTestMeEndpoint = async () => {
    const { data: { session } = { session: null } } = await supabase.auth.getSession();

    if (!session) {
      // eslint-disable-next-line no-console
      console.log("Test /api/me: no Supabase session found");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/api/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json().catch(() => null);
      // eslint-disable-next-line no-console
      console.log("Test /api/me result:", res.status, body);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Test /api/me error:", err);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Roamly
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
          <Button variant="default" size="sm" className="font-sans" onClick={handleSignInWithGoogle}>
            Sign In
          </Button>
          {import.meta.env.DEV && (
            <Button
              variant="outline"
              size="sm"
              className="font-sans"
              onClick={handleTestMeEndpoint}
            >
              Test /me
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
              {import.meta.env.DEV && (
                <Button
                  variant="outline"
                  className="mt-2 font-sans"
                  onClick={() => {
                    setMobileOpen(false);
                    void handleTestMeEndpoint();
                  }}
                >
                  Test /me
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
