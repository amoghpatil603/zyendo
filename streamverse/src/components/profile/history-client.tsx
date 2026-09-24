"use client";

import { useEffect, useState, useCallback } from "react";
import { getGroupedWatchHistoryAction, removeWatchHistoryEntryAction } from "@/app/actions/profile";
import type { WatchHistoryGroup } from "@/types/profile";
import { Clock, Film, Tv, Monitor, Trash2, Filter } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

const typeIcons: Record<string, React.ElementType> = {
  movie: Film,
  tv: Tv,
  anime: Monitor,
};

const typeFilters = [
  { label: "All", value: undefined },
  { label: "Movies", value: "movie" },
  { label: "TV", value: "tv" },
  { label: "Anime", value: "anime" },
];

export function HistoryClient() {
  const [groups, setGroups] = useState<WatchHistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getGroupedWatchHistoryAction({ mediaType: filter, limit: 50 });
    if (result.ok) {
      setGroups(result.data);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(id: string) {
    await removeWatchHistoryEntryAction({ id });
    load();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="glass flex flex-col items-center justify-center rounded-2xl p-12 text-center">
        <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No watch history yet</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Start watching movies and shows to build your history.
        </p>
        <Button asChild>
          <Link href="/">Discover something to watch</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {typeFilters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* History groups */}
      {groups.map((group) => (
        <section key={group.date} className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {group.label}
            <span className="h-px flex-1 bg-border" />
          </h3>

          <div className="space-y-3">
            {group.entries.map((entry) => {
              const Icon = typeIcons[entry.mediaType] ?? Film;
              return (
                <div
                  key={entry.id}
                  className="glass group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:shadow-md"
                >
                  {entry.coverImageUrl ? (
                    <Link
                      href={`/${entry.mediaType}/${entry.mediaId}`}
                      className="h-16 w-12 shrink-0 overflow-hidden rounded-lg"
                    >
                      <img
                        src={entry.coverImageUrl}
                        alt={entry.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </Link>
                  ) : (
                    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  <Link
                    href={`/${entry.mediaType}/${entry.mediaId}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                      {entry.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {entry.mediaType}
                      </span>
                      {entry.durationMinutes && (
                        <span>{entry.durationMinutes}m</span>
                      )}
                      {entry.rating && (
                        <span className="text-amber-400">★ {entry.rating}/10</span>
                      )}
                    </div>
                  </Link>

                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="shrink-0 rounded-full p-2 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title="Remove from history"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}