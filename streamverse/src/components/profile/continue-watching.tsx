"use client";

import type { WatchHistoryEntry } from "@/types/profile";
import { Clock, Film, Tv, Monitor } from "lucide-react";
import Link from "next/link";

interface ContinueWatchingProps {
  entries: WatchHistoryEntry[];
}

const typeIcons: Record<string, React.ElementType> = {
  movie: Film,
  tv: Tv,
  anime: Monitor,
};

export function ContinueWatching({ entries }: ContinueWatchingProps) {
  if (!entries.length) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Continue Watching</h2>
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-8 text-center">
          <Clock className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Your recently watched titles will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Continue Watching</h2>
        <Link
          href="/history"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entries.slice(0, 4).map((entry) => {
          const Icon = typeIcons[entry.mediaType] ?? Film;
          return (
            <Link
              key={entry.id}
              href={`/${entry.mediaType}/${entry.mediaId}`}
              className="glass group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:shadow-md"
            >
              {entry.coverImageUrl ? (
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={entry.coverImageUrl}
                    alt={entry.title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span>{entry.mediaType}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}