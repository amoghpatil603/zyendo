"use client";

import type { UserStats } from "@/types/profile";
import { Film, Tv, Clock, Star, BookOpen, Library } from "lucide-react";

interface StatsCardsProps {
  stats: UserStats | null;
}

const statConfigs = [
  {
    key: "movies",
    label: "Movies",
    icon: Film,
    getValue: (s: UserStats) => s.totalMoviesWatched,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    key: "episodes",
    label: "Episodes",
    icon: Tv,
    getValue: (s: UserStats) => s.totalTvEpisodesWatched + s.totalAnimeEpisodesWatched,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "hours",
    label: "Hours",
    icon: Clock,
    getValue: (s: UserStats) => Math.round(s.totalHoursWatched),
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    key: "rating",
    label: "Avg Rating",
    icon: Star,
    getValue: (s: UserStats) => s.averageRating?.toFixed(1) ?? "—",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    key: "reviews",
    label: "Reviews",
    icon: BookOpen,
    getValue: (s: UserStats) => s.totalReviewsWritten,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    key: "collections",
    label: "Collections",
    icon: Library,
    getValue: (s: UserStats) => s.totalCollectionsCreated,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statConfigs.map((cfg) => {
          const Icon = cfg.icon;
          return (
            <div
              key={cfg.key}
              className="glass flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold text-muted-foreground">—</span>
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {statConfigs.map((cfg) => {
        const Icon = cfg.icon;
        const value = cfg.getValue(stats);
        return (
          <div
            key={cfg.key}
            className="glass flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            <div className={`rounded-full p-2 ${cfg.bg}`}>
              <Icon className={`h-5 w-5 ${cfg.color}`} />
            </div>
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}