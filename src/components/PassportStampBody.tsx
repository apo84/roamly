import { Link } from "react-router-dom";
import { Film, FolderHeart } from "lucide-react";
import {
  clipDestination,
  collectionDestination,
  findCollectionById,
  findVideoById,
} from "@/data/passportStamps";
import { cn } from "@/lib/utils";

const TOKEN_RE = /\{\{(clip|collection):([^}]+)\}\}/g;

type Segment =
  | { kind: "text"; value: string }
  | { kind: "clip"; id: string }
  | { kind: "collection"; id: string };

function parseBody(body: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE.source, "g");
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", value: body.slice(last, m.index) });
    }
    const type = m[1] as "clip" | "collection";
    const id = m[2].trim();
    segments.push({ kind: type, id });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    segments.push({ kind: "text", value: body.slice(last) });
  }
  return segments;
}

export default function PassportStampBody({ body, className }: { body: string; className?: string }) {
  const segments = parseBody(body);

  return (
    <p className={cn("text-sm font-sans leading-relaxed text-foreground/90 whitespace-pre-wrap", className)}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        if (seg.kind === "clip") {
          const video = findVideoById(seg.id);
          const label = video?.title ?? `Clip ${seg.id}`;
          return (
            <Link
              key={i}
              to={clipDestination(seg.id)}
              className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors align-baseline"
            >
              <Film className="w-3 h-3 shrink-0" />
              <span className="line-clamp-1 max-w-[12rem]">{label}</span>
            </Link>
          );
        }
        const col = findCollectionById(seg.id);
        const label = col?.name ?? `Collection`;
        return (
          <Link
            key={i}
            to={collectionDestination(seg.id)}
            className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md bg-accent/20 text-accent-foreground font-medium hover:bg-accent/30 transition-colors align-baseline"
          >
            <FolderHeart className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1 max-w-[12rem]">{label}</span>
          </Link>
        );
      })}
    </p>
  );
}
