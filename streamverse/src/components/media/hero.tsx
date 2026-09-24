"use client";

import { useEffect, useState } from "react";
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
  candidates,
}: {
  item: MediaItem;
  isAuthenticated: boolean;
  inWatchlist: boolean;
  candidates?: MediaItem[];
}) {
  const [current, setCurrent] = useState(item);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    setCurrent(item);
    setFade(false);
  }, [item]);

  useEffect(() => {
    if (!candidates || candidates.length <= 1) return;

    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setCurrent((prev) => {
          const idx = candidates.findIndex((c) => c.externalId === prev.externalId);
          const next = candidates[(idx + 1) % candidates.length];
          return next;
        });
        setFade(false);
      }, 300);
    }, 8000);

    return () => clearInterval(interval);
  }, [candidates]);

  const year = formatYear(current.releaseDate);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60">
      <div className="relative h-[60vh] min-h-[400px] w-full sm:h-[70vh] md:h-[75vh]">
        {current.backdropImageUrl ? (
          <Image
            src={current.backdropImageUrl}
            alt={current.title}
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className={`object-cover object-top transition-opacity duration-300 ${fade ? "opacity-0" : "opacity-100"}`}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      </div>

      <div className={`absolute inset-x-0 bottom-0 max-w-3xl space-y-5 p-6 sm:p-10 lg:p-14 transition-opacity duration-300 ${fade ? "opacity-0" : "opacity-100"}`}>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground shadow-sm">
            {mediaTypeLabel(current.type)}
          </span>
          {year ? (
            <span className="text-muted-foreground">{year}</span>
          ) : null}
          <RatingBadge voteAverage={current.voteAverage} />
        </div>

        <h1 className="text-4xl font-bold tracking-tight drop-shadow sm:text-5xl lg:text-7xl">
          {current.title}
        </h1>

        {current.synopsis ? (
          <p className="line-clamp-3 max-w-2xl text-base/relaxed text-muted-foreground sm:text-lg/relaxed">
            {current.synopsis}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={mediaHref(current)}>
              <Info className="size-4" />
              View details
            </Link>
          </Button>
          <WatchlistButton
            mediaType={current.type}
            mediaId={current.externalId}
            initialInWatchlist={inWatchlist}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </section>
  );
}
