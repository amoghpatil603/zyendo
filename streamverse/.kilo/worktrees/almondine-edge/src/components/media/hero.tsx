import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";

import type { MediaItem } from "@/types/media-item";
import { Button } from "@/components/ui/button";
import { mediaHref } from "@/lib/links";
import { formatYear, mediaTypeLabel } from "@/lib/format";
import { RatingBadge } from "./rating-badge";
import { WatchlistButton } from "./watchlist-button";

export function Hero({
  item,
  isAuthenticated,
  inWatchlist,
}: {
  item: MediaItem;
  isAuthenticated: boolean;
  inWatchlist: boolean;
}) {
  const year = formatYear(item.releaseDate);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60">
      <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
        {item.backdropImageUrl ? (
          <Image
            src={item.backdropImageUrl}
            alt={item.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 max-w-3xl space-y-4 p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-primary">
            {mediaTypeLabel(item.type)}
          </span>
          {year ? (
            <span className="text-muted-foreground">{year}</span>
          ) : null}
          <RatingBadge voteAverage={item.voteAverage} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight drop-shadow sm:text-5xl">
          {item.title}
        </h1>

        {item.synopsis ? (
          <p className="line-clamp-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {item.synopsis}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={mediaHref(item)}>
              <Info className="size-4" />
              View details
            </Link>
          </Button>
          <WatchlistButton
            mediaType={item.type}
            mediaId={item.externalId}
            initialInWatchlist={inWatchlist}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </section>
  );
}
