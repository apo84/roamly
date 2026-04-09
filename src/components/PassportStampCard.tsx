import { motion } from "framer-motion";
import { Film, FolderHeart, Stamp } from "lucide-react";
import { Link } from "react-router-dom";
import PassportStampBody from "@/components/PassportStampBody";
import type { PassportStamp } from "@/data/passportStamps";
import { clipDestination, collectionDestination, findCollectionById, findVideoById } from "@/data/passportStamps";

function formatStampDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PassportStampCard({ stamp, index }: { stamp: PassportStamp; index: number }) {
  const postmark = formatStampDate(stamp.postedAt);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", damping: 22 }}
      className="relative"
    >
      {/* Postage stamp perforation + paper */}
      <div
        className="relative rounded-lg bg-[#f6f0e6] dark:bg-card border-2 border-[#c4b8a5]/80 dark:border-border shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden"
        style={{
          clipPath:
            "polygon(0% 4px, 4px 4px, 4px 0%, calc(100% - 4px) 0%, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0% calc(100% - 4px))",
        }}
      >
        {/* Inner frame like engraved border */}
        <div className="m-2 sm:m-3 border border-dashed border-[#8b7355]/45 dark:border-border rounded-md p-4 sm:p-5 bg-[#faf7f1]/90 dark:bg-card/80">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Stamp className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold leading-tight line-clamp-2">{stamp.title}</h3>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-sans mt-0.5">
                  Roamly passport stamp
                </p>
              </div>
            </div>

            {/* Circular postmark */}
            <div className="shrink-0 w-[4.5rem] h-[4.5rem] rounded-full border-2 border-primary/40 flex flex-col items-center justify-center rotate-[-8deg] bg-background/60 dark:bg-background/40">
              <span className="text-[9px] font-sans font-bold text-primary uppercase tracking-tighter">Posted</span>
              <span className="text-[10px] font-sans text-foreground/80 text-center leading-tight px-1">{postmark}</span>
            </div>
          </div>

          <PassportStampBody body={stamp.body} className="mb-4" />

          {stamp.attachments.length > 0 && (
            <div className="pt-3 border-t border-[#c4b8a5]/40 dark:border-border">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-sans mb-2">Linked in app</p>
              <div className="flex flex-wrap gap-2">
                {stamp.attachments.map((a) => {
                  if (a.type === "clip") {
                    const v = findVideoById(a.id);
                    return (
                      <Link
                        key={`${a.type}-${a.id}`}
                        to={clipDestination(a.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-sans px-2.5 py-1.5 rounded-full bg-background/80 dark:bg-secondary border border-border hover:border-primary/50 transition-colors"
                      >
                        <Film className="w-3.5 h-3.5 text-primary" />
                        <span className="line-clamp-1 max-w-[10rem]">{v?.title ?? a.id}</span>
                      </Link>
                    );
                  }
                  const c = findCollectionById(a.id);
                  return (
                    <Link
                      key={`${a.type}-${a.id}`}
                      to={collectionDestination(a.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-sans px-2.5 py-1.5 rounded-full bg-background/80 dark:bg-secondary border border-border hover:border-accent transition-colors"
                    >
                      <FolderHeart className="w-3.5 h-3.5 text-accent-foreground" />
                      <span className="line-clamp-1 max-w-[10rem]">{c?.name ?? a.id}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
