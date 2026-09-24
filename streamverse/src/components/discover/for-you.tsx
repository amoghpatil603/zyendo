"use client";

import { useState, useEffect, useCallback } from "react";
import { User, History, ListMusic, FolderOpen, Dna, Users } from "lucide-react";
import type { ForYouSection } from "@/lib/discovery/feed-actions";
import { MediaCarousel } from "@/components/media/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaItem } from "@/types/media-item";

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 rounded-xl" />
      ))}
    </div>
  );
}

function Row({ title, icon: Icon, items }: { title: string; icon: React.ComponentType<{ className?: string }>; items: MediaItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </h3>
      <MediaCarousel items={items} />
    </div>
  );
}

export function ForYou() {
  const [data, setData] = useState<ForYouSection | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/discovery/feed-actions");
      const d = await mod.getForYouSection();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <User className="size-5 text-primary" />
        For You
      </h2>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-36" />
              <CarouselSkeleton />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <Row title="Continue Watching" icon={History} items={data.continueWatching} />
          <Row title="Based on Your History" icon={ListMusic} items={data.basedOnHistory} />
          <Row title="From Your Queue" icon={ListMusic} items={data.basedOnQueue} />
          <Row title="From Your Collections" icon={FolderOpen} items={data.fromCollections} />
          <Row title="Based on Your DNA" icon={Dna} items={data.fromDna} />
          <Row title="Friends Are Watching" icon={Users} items={data.fromFriends} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to see personalized recommendations.</p>
      )}
    </section>
  );
}
