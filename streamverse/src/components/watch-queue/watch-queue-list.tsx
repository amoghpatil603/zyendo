"use client";

import * as React from "react";

import type { WatchQueueItem } from "@/lib/watch-queue-data";
import WatchQueueItemCard from "@/components/watch-queue/watch-queue-item-card";

export default function WatchQueueList(props: {
  items: WatchQueueItem[];
  optimisticById?: Record<string, Partial<WatchQueueItem>>;
}) {
  const { items, optimisticById } = props;

  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <WatchQueueItemCard
          key={item.id}
          item={item}
          optimistic={optimisticById?.[item.id]}
        />
      ))}
    </div>
  );
}

