"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Calendar, Bot } from "lucide-react";
import type { DailyPick } from "@/lib/discovery/daily-pick";
import { MediaCard } from "@/components/media/media-card";
import { Skeleton } from "@/components/ui/skeleton";

export function DailyDiscovery() {
  const [picks, setPicks] = useState<DailyPick | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/discovery/daily-pick");
      const data = await mod.getDailyPick();
      setPicks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!picks) return null;

  const items = [picks.trending, picks.movie, picks.tvShow, picks.hiddenGem].filter(Boolean);

  if (items.length === 0 && !picks.aiPick) return null;

  const hasAiPick = picks.aiPick !== null && picks.aiPick !== undefined;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <h2 className="text-lg font-semibold">Daily Discovery</h2>
        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
          <Calendar className="size-3" />
          {picks.date}
        </span>
      </div>
      <div className={`grid grid-cols-2 gap-3 ${hasAiPick ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        {items.map((item) => item && (
          <MediaCard key={item.id} item={item} />
        ))}
        {hasAiPick && (
          <div className="relative">
            <MediaCard item={picks.aiPick!.media} />
            <div className="absolute left-2 bottom-12 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
              <Bot className="size-3" />
              AI Pick
            </div>
            {picks.aiPick!.why && (
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground leading-tight px-1">
                {picks.aiPick!.why}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

