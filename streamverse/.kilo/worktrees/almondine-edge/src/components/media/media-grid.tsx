import type { MediaItem } from "@/types/media-item";
import { cn } from "@/lib/utils";
import { MediaCard } from "./media-card";

export function MediaGrid({
  items,
  className,
  priorityCount = 0,
}: {
  items: MediaItem[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {items.map((item, i) => (
        <MediaCard key={item.id} item={item} priority={i < priorityCount} />
      ))}
    </div>
  );
}
