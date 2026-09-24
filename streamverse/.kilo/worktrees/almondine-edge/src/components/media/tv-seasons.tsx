"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2, Tv } from "lucide-react";

import type { SeasonSummary } from "@/types/media-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatRuntime } from "@/lib/format";

interface EpisodeSummary {
  id: number;
  episodeNumber: number;
  name: string;
  overview: string;
  stillUrl: string | null;
  airDate?: string;
  runtimeMinutes?: number;
  voteAverage?: number;
}

export function TvSeasons({
  tvId,
  seasons,
}: {
  tvId: string;
  seasons: SeasonSummary[];
}) {
  const [selected, setSelected] = useState(
    seasons[0]?.seasonNumber.toString() ?? "1",
  );
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/tv/${tvId}/seasons/${selected}`);
        if (!res.ok) throw new Error("failed");
        const data: { episodes: EpisodeSummary[] } = await res.json();
        if (!cancelled) setEpisodes(data.episodes ?? []);
      } catch {
        if (!cancelled) {
          setEpisodes([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tvId, selected]);

  if (seasons.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold sm:text-xl">Seasons &amp; Episodes</h2>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-48" aria-label="Select season">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s.seasonNumber} value={s.seasonNumber.toString()}>
                {s.name} ({s.episodeCount} ep)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading episodes...
        </div>
      ) : error ? (
        <p className="py-6 text-sm text-muted-foreground">
          Couldn&apos;t load episodes for this season.
        </p>
      ) : episodes.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          No episode information available.
        </p>
      ) : (
        <ul className="space-y-3">
          {episodes.map((ep) => (
            <li
              key={ep.id}
              className="flex gap-4 rounded-xl border border-border/60 bg-card/50 p-3"
            >
              <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
                {ep.stillUrl ? (
                  <Image
                    src={ep.stillUrl}
                    alt={ep.name}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Tv className="size-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {ep.episodeNumber}. {ep.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[formatDate(ep.airDate), formatRuntime(ep.runtimeMinutes)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {ep.overview ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {ep.overview}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
