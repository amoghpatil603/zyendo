"use client";

import { motion } from "motion/react";
import type { GenreWeight } from "@/types/dna";

/**
 * Horizontal bar chart showing the user's top genre affinities.
 * Each bar's width is proportional to the genre's weight (0–1).
 */
export function DnaGenreChart({
  genreWeights,
}: {
  genreWeights: GenreWeight[];
}) {
  if (genreWeights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No genre data yet. Add titles to your watchlist to build your DNA.
      </p>
    );
  }

  const top = genreWeights.slice(0, 12);

  return (
    <div className="space-y-3">
      {top.map((genre, i) => (
        <div key={genre.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{genre.name}</span>
            <span className="text-muted-foreground">{genre.count} title{genre.count !== 1 ? "s" : ""}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.round(genre.weight * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}