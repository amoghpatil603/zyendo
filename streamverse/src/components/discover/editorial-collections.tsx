"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { MediaCarousel } from "@/components/media/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaItem } from "@/types/media-item";

interface EditorialCollectionItem {
  id: string;
  mediaType: string;
  mediaId: string;
  note: string | null;
  sortOrder: number;
  media: MediaItem | null;
}

interface EditorialCollection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  mediaType: string | null;
  itemCount: number;
  sortOrder: number;
  items: EditorialCollectionItem[];
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 rounded-xl sm:w-44" />
      ))}
    </div>
  );
}

export function EditorialCollections() {
  const [collections, setCollections] = useState<EditorialCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/discovery/cms-resolver");
      const data = await mod.getResolvedEditorialCollections();
      setCollections(data);
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Don't render if no collections
  if (!loading && collections.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Editorial Collections</h2>
      </div>

      {loading ? (
        <CarouselSkeleton />
      ) : (
        <div className="space-y-6">
          {collections.map((collection) => {
            const items = collection.items
              .map((item) => item.media)
              .filter((item): item is MediaItem => item !== null);

            if (items.length === 0) return null;

            return (
              <div key={collection.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-medium">{collection.title}</h3>
                    {collection.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {collection.itemCount} items
                    </p>
                  </div>
                  <a
                    href={`/discover/collections/${collection.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View All
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <MediaCarousel items={items.slice(0, 10)} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}