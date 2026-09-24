import Image from "next/image";
import Link from "next/link";
import { Film, Tv } from "lucide-react";

import type { MediaItem } from "@/types/media-item";
import { cn } from "@/lib/utils";
import { mediaHref } from "@/lib/links";
import { formatYear, mediaTypeLabel } from "@/lib/format";
import { RatingBadge } from "./rating-badge";

export function MediaCard({
  item,
  className,
  priority = false,
}: {
  item: MediaItem;
  className?: string;
  priority?: boolean;
}) {
  const year = formatYear(item.releaseDate);
  const TypeIcon = item.type === "tv" ? Tv : Film;

  return (
    <Link
      href={mediaHref(item)}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border/60 bg-card outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {item.coverImageUrl ? (
          <Image
            src={item.coverImageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
            className="object-cover transition duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <TypeIcon className="size-10" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-90" />

        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            <TypeIcon className="size-3" />
            {mediaTypeLabel(item.type)}
          </span>
        </div>
        <div className="absolute right-2 top-2">
          <RatingBadge voteAverage={item.voteAverage} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-white drop-shadow">
            {item.title}
          </h3>
          {year ? <p className="text-xs text-white/70">{year}</p> : null}
        </div>
      </div>
    </Link>
  );
}
