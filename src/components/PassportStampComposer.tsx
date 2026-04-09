import { useCallback, useMemo, useState } from "react";
import { Plus, Film, FolderHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { barcelonaVideos } from "@/data/barcelonaData";
import { mockCollections } from "@/data/mockData";
import {
  appendPassportStamp,
  extractAttachmentsFromBody,
  type PassportStamp,
} from "@/data/passportStamps";

export default function PassportStampComposer({ onPosted }: { onPosted: (stamps: PassportStamp[]) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const insertToken = useCallback((type: "clip" | "collection", id: string) => {
    const token = type === "clip" ? `{{clip:${id}}}` : `{{collection:${id}}}`;
    setBody((prev) => {
      const spacer = prev.length && !/\s$/.test(prev) ? " " : "";
      return `${prev}${spacer}${token} `;
    });
  }, []);

  const handlePost = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const stamp: PassportStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim() || "Untitled stamp",
      body: trimmed,
      postedAt: new Date().toISOString(),
      attachments: extractAttachmentsFromBody(trimmed),
    };
    const next = appendPassportStamp(stamp);
    onPosted(next);
    setTitle("");
    setBody("");
    setOpen(false);
  };

  const clips = useMemo(() => barcelonaVideos, []);
  const collections = useMemo(() => mockCollections, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2 font-sans w-full sm:w-auto shadow-card">
          <Plus className="w-4 h-4" />
          Issue new stamp
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] rounded-t-2xl flex flex-col">
        <SheetHeader className="text-left space-y-1 pb-2">
          <SheetTitle className="font-display">Write a passport stamp</SheetTitle>
          <SheetDescription className="font-sans">
            Tell your story. Insert clips and collections — they become tappable links in the app.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-8">
          <div>
            <label className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wide">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Golden hour in El Born"
              className="mt-1.5 font-sans"
            />
          </div>

          <div>
            <label className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wide">Story</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write freely… Use the buttons below to drop in inspo clips or collections."
              className="mt-1.5 min-h-[140px] font-sans resize-y"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card/50 p-3">
              <p className="text-xs font-semibold font-sans flex items-center gap-1.5 mb-2">
                <Film className="w-3.5 h-3.5 text-primary" />
                Barcelona clips
              </p>
              <p className="text-[11px] text-muted-foreground font-sans mb-2">Tap to insert into your story</p>
              <ul className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {clips.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => insertToken("clip", v.id)}
                      className="w-full text-left text-xs font-sans px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors line-clamp-2"
                    >
                      {v.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-3">
              <p className="text-xs font-semibold font-sans flex items-center gap-1.5 mb-2">
                <FolderHeart className="w-3.5 h-3.5 text-accent-foreground" />
                Collections
              </p>
              <p className="text-[11px] text-muted-foreground font-sans mb-2">Curated lists (opens spotlight or your library)</p>
              <ul className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {collections.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => insertToken("collection", c.id)}
                      className="w-full text-left text-xs font-sans px-2 py-1.5 rounded-lg hover:bg-accent/15 transition-colors line-clamp-2"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 pt-3 border-t border-border bg-background flex gap-2">
          <Button variant="outline" className="flex-1 font-sans" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="flex-1 font-sans" type="button" onClick={handlePost} disabled={!body.trim()}>
            Post stamp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
