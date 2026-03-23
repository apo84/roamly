import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated } = useAuth();

  const handleSignInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:8080/auth/callback",
      },
    });
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="font-display text-3xl font-bold">Sign in to continue</h1>
        <p className="text-muted-foreground font-sans">
          Sign in to save collections, build itineraries, and keep your travel passport in Trove.
        </p>
        <Button
          size="lg"
          className="gap-2 font-sans mt-4"
          onClick={() => {
            void handleSignInWithGoogle();
          }}
        >
          Continue with Google
        </Button>
      </div>
    </main>
  );
}

