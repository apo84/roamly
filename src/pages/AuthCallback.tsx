import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const finalize = async () => {
      // Hydrate Supabase session from the OAuth callback.
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        // eslint-disable-next-line no-console
        console.warn("AuthCallback: no active Supabase session", { data, error });
        return;
      }

      // Automatically call the backend to upsert the user into public.users
      // and fetch their stored profile data.
      try {
        if (!API_URL) {
          // eslint-disable-next-line no-console
          console.error("Missing VITE_API_URL. Set it in .env.local or Vercel env vars.");
          navigate("/", { replace: true });
          return;
        }

        const res = await fetch(`${API_URL}/api/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const body = await res.json().catch(() => null);

        if (res.ok && body?.user) {
          // Make the user profile available to the frontend (for now via localStorage).
          // Consumers can read this and/or use a dedicated hook later.
          localStorage.setItem("troveCurrentUser", JSON.stringify(body.user));
          setUser(body.user);
        } else {
          // eslint-disable-next-line no-console
          console.warn("AuthCallback: /api/me did not return a user", res.status, body);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("AuthCallback: error calling /api/me", e);
      }

      navigate("/", { replace: true });
    };

    void finalize();
  }, [navigate, setUser]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="font-sans text-sm text-muted-foreground">Signing you in...</p>
    </main>
  );
}

