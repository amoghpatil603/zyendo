import type { Collection } from "@/types/collection";
import { CollectionCard } from "./collection-card";
import { cn } from "@/lib/utils";

export function CollectionGrid({
  collections,
  className,
}: {
  collections: Collection[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {collections.map((c) => (
        <CollectionCard key={c.id} collection={c} />
      ))}
    </div>
  );
}
