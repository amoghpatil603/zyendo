"use client";

import * as React from "react";

import type { WatchQueueItem, WatchQueuePriority, WatchQueueStats, WatchQueueStatus } from "@/lib/watch-queue-data";
import WatchQueueToolbar, { DEFAULT_WATCH_QUEUE_TOOLBAR_STATE, type WatchQueueToolbarState } from "@/components/watch-queue/watch-queue-toolbar";
import WatchQueueStatsView from "@/components/watch-queue/watch-queue-stats";
import WatchQueueEmpty from "@/components/watch-queue/watch-queue-empty";
import WatchQueueLoading from "@/components/watch-queue/watch-queue-loading";
import WatchQueueList from "@/components/watch-queue/watch-queue-list";
import { DEFAULT_WATCH_QUEUE_TOOLBAR_STATE as TB_DEFAULT } from "@/components/watch-queue/watch-queue-toolbar";

import { getWatchQueueAction } from "@/app/actions/watch-queue";

import { PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function WatchQueueClient() {
  const [state, setState] = React.useState<WatchQueueToolbarState>(TB_DEFAULT);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<WatchQueueItem[]>([]);
  const [stats, setStats] = React.useState<WatchQueueStats>({ movies: 0, tv: 0, pending: 0, watching: 0, watched: 0, total: 0, completed: 0 });
  const [optimisticById, setOptimisticById] = React.useState<Record<string, Partial<WatchQueueItem>>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWatchQueueAction();
      if (!res.ok) {
        setItems([]);
        setStats({ movies: 0, tv: 0, pending: 0, watching: 0, watched: 0, total: 0, completed: 0 });
        return;
      }
      setItems(res.items);
      setStats(res.stats);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onReset = () => setState(TB_DEFAULT);

  const filtered = React.useMemo(() => {
    const q = state.query.trim().toLowerCase();
    let res = items;
    if (state.status !== "all") {
      res = res.filter((i) => i.status === state.status);
    }
    if (state.priority !== "all") {
      res = res.filter((i) => i.priority === state.priority);
    }
    if (state.favoritesOnly) {
      res = res.filter((i) => i.favorite);
    }
    if (q) {
      res = res.filter((i) => i.title.toLowerCase().includes(q) || i.tmdbId.includes(q));
    }

    const sortKey = state.sortKey;
    const getAdded = (i: WatchQueueItem) => Date.parse(i.addedAt);
    const getTitle = (i: WatchQueueItem) => i.title.toLowerCase();
    const getPriority = (p: WatchQueuePriority) => (p === "high" ? 3 : p === "medium" ? 2 : 1);

    res = [...res].sort((a, b) => {
      switch (sortKey) {
        case "added_desc":
          return getAdded(b) - getAdded(a);
        case "added_asc":
          return getAdded(a) - getAdded(b);
        case "title_asc":
          return getTitle(a).localeCompare(getTitle(b));
        case "title_desc":
          return getTitle(b).localeCompare(getTitle(a));
        case "priority_desc":
          return getPriority(b.priority) - getPriority(a.priority);
        case "priority_asc":
          return getPriority(a.priority) - getPriority(b.priority);
      }
    });

    return res;
  }, [items, state]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-0">
      <WatchQueueToolbar
        state={state}
        statsBadge={<WatchQueueStatsView stats={stats} />}
        onChange={setState}
        onReset={onReset}
        isPending={loading}
      />

      {loading ? (
        <WatchQueueLoading />
      ) : filtered.length ? (
        <WatchQueueList items={filtered} optimisticById={optimisticById} />
      ) : (
        <WatchQueueEmpty
          icon={PlayCircle}
          title="No items in your queue"
          description={state.favoritesOnly ? "Try turning off favorites-only." : "Add a movie or TV show to get started."}
          action={
            <Button variant="secondary" onClick={onReset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          }
        />
      )}
    </div>
  );
}


