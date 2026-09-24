import Image from "next/image";
import { CalendarDays, Clock, Film, Globe, Tv } from "lucide-react";

import type { MediaDetail } from "@/types/media-item";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/common/page-container";
import { RatingBadge } from "./rating-badge";
import { TrailerEmbed } from "./trailer-embed";
import { WatchlistButton } from "./watchlist-button";
import { WhereToWatch } from "./where-to-watch";
import { CastList } from "./cast-list";
import { MediaRow } from "./media-row";
import { formatDate, formatRuntime, mediaTypeLabel } from "@/lib/format";

export function MediaDetailView({
  detail,
  isAuthenticated,
  inWatchlist,
  children,
}: {
  detail: MediaDetail;
  isAuthenticated: boolean;
  inWatchlist: boolean;
  children?: React.ReactNode;
}) {
  const runtime = formatRuntime(detail.runtimeMinutes);
  const releaseDate = formatDate(detail.releaseDate);
  const TypeIcon = detail.type === "tv" ? Tv : Film;

  return (
    <div>
      {/* Backdrop header */}
      <div className="relative">
        <div className="relative h-[38vh] min-h-64 w-full sm:h-[46vh]">
          {detail.backdropImageUrl ? (
            <Image
              src={detail.backdropImageUrl}
              alt={detail.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/25 to-accent/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </div>

        <PageContainer className="relative -mt-40 sm:-mt-48">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-2xl sm:w-48">
              {detail.coverImageUrl ? (
                <Image
                  src={detail.coverImageUrl}
                  alt={detail.title}
                  fill
                  sizes="(max-width: 640px) 128px, 192px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <TypeIcon className="size-10" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <TypeIcon className="size-3" />
                  {mediaTypeLabel(detail.type)}
                </Badge>
                <RatingBadge voteAverage={detail.voteAverage} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {detail.title}
              </h1>

              {detail.tagline ? (
                <p className="italic text-muted-foreground">{detail.tagline}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {releaseDate ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-4" />
                    {releaseDate}
                  </span>
                ) : null}
                {runtime ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" />
                    {runtime}
                  </span>
                ) : null}
                {detail.originalLanguage ? (
                  <span className="inline-flex items-center gap-1.5 uppercase">
                    <Globe className="size-4" />
                    {detail.originalLanguage}
                  </span>
                ) : null}
              </div>

              {detail.genres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.genres.map((g) => (
                    <Badge key={g} variant="outline">
                      {g}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-1">
                <TrailerEmbed trailers={detail.trailers} />
                <WatchlistButton
                  mediaType={detail.type}
                  mediaId={detail.externalId}
                  initialInWatchlist={inWatchlist}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="space-y-10">
        {detail.synopsis ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold sm:text-xl">Overview</h2>
            <p className="max-w-3xl leading-relaxed text-muted-foreground">
              {detail.synopsis}
            </p>
          </section>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10">
            {children}
            <CastList people={detail.people} />
          </div>
          <WhereToWatch
            providers={detail.watchProviders}
            watchLink={detail.watchLink}
            title={detail.title}
          />
        </div>

        {detail.similar.length > 0 ? (
          <MediaRow title="More like this" items={detail.similar} />
        ) : null}
      </PageContainer>
    </div>
  );
}
