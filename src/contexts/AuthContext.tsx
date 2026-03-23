import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface AppUser {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  setUser: (user: AppUser | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("troveCurrentUser");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AppUser;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      localStorage.setItem("troveCurrentUser", JSON.stringify(user));
    } else {
      localStorage.removeItem("troveCurrentUser");
    }
  }, [user]);

  const setUser = (next: AppUser | null) => {
    setUserState(next);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // ignore if backend unreachable (e.g. local dev without backend)
      }
    }
    setUserState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        setUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

