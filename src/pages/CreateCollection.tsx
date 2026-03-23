import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function CreateCollection() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("You must be signed in to create a collection");
        return;
      }

      const res = await fetch(`${API_URL}/api/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          cover_image_url: coverImageUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to create collection");
        return;
      }

      navigate("/collections", { replace: true });
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen">
      <div className="container mx-auto max-w-md">
        <h1 className="font-display text-3xl font-bold mb-2">New Collection</h1>
        <p className="text-muted-foreground font-sans mb-6">Give your collection a name and optional details.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="font-sans">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tokyo 2026"
              className="mt-1.5 font-sans"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="font-sans">
              Description
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection about?"
              rows={3}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-sans ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city" className="font-sans">
                City
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Tokyo"
                className="mt-1.5 font-sans"
              />
            </div>
            <div>
              <Label htmlFor="country" className="font-sans">
                Country
              </Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Japan"
                className="mt-1.5 font-sans"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cover" className="font-sans">
              Cover image URL
            </Label>
            <Input
              id="cover"
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1.5 font-sans"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-sans">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="font-sans" disabled={submitting}>
              {submitting ? "Creating…" : "Create collection"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="font-sans"
              disabled={submitting}
              onClick={() => navigate("/collections")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
