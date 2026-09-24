"use client";

import type { DnaMoodTag } from "@/types/dna";

export function DnaMoodTags({ moodTags }: { moodTags: DnaMoodTag[] }) {
  if (moodTags.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Your Moods
      </h3>
      <div className="flex flex-wrap gap-2">
        {moodTags.map((mood) => (
          <span
            key={mood.tag}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-sm font-medium text-primary"
            style={{ opacity: 0.4 + mood.weight * 0.6 }}
          >
            {mood.tag}
          </span>
        ))}
      </div>
    </section>
  );
}