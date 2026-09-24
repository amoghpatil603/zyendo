"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Library, Heart } from "lucide-react";
import type { CollectionWithInteraction } from "@/types/social";

export function PopularCollections() {
  const [collections, setCollections] = useState<CollectionWithInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      const data = await mod.getPopularCollections(5);
      setCollections(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border/60 glass p-3">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-2 h-3 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 glass p-4 text-center text-sm text-muted-foreground">
        No public collections yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {collections.map((c) => (
        <Link
          key={c.id}
          href={`/collections/${c.id}`}
          className="flex items-start gap-3 rounded-xl border border-border/60 glass p-3 transition hover:border-primary/30"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Library className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {c.itemCount} {c.itemCount === 1 ? "title" : "titles"} · {c.likeCount}{" "}
              <Heart className="inline size-3" />
            </p>
            {c.userName && (
              <p className="mt-0.5 text-xs text-muted-foreground">by {c.userName}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
