"use client";

import type { WatchQueueStats } from "@/lib/watch-queue-data";
import { Badge } from "@/components/ui/badge";

export default function WatchQueueStatsView(props: { stats: WatchQueueStats }) {
  const { stats } = props;
  return (
    <div className="flex items-center gap-3 text-sm">
      <Badge variant="secondary">{stats.pending} Pending</Badge>
      <Badge variant="secondary">{stats.watching} Watching</Badge>
      <Badge variant="secondary">{stats.watched} Watched</Badge>
    </div>
  );
}

