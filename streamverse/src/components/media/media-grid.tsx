"use client";

import type { MediaItem } from "@/types/media-item";
import { cn } from "@/lib/utils";
import { MediaCard } from "./media-card";
import { VirtuosoGrid } from "react-virtuoso";
import type { ReactNode } from "react";

export function MediaGrid({
  items,
  className,
  priorityCount = 0,
  endReached,
  footer,
}: {
  items: MediaItem[];
  className?: string;
  priorityCount?: number;
  endReached?: () => void;
  footer?: ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn("w-full", className)}>
      <VirtuosoGrid
        useWindowScroll
        data={items}
        endReached={endReached}
        overscan={400}
        listClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        itemContent={(index, item) => (
          <MediaCard key={item.id} item={item} priority={index < priorityCount} />
        )}
        components={footer ? { Footer: () => <>{footer}</> } : undefined}
      />
    </div>
  );
}
