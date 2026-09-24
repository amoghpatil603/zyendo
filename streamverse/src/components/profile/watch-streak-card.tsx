"use client";

import type { WatchStreak } from "@/types/profile";
import { Flame, CalendarDays, ArrowUp } from "lucide-react";

interface WatchStreakCardProps {
  streak: WatchStreak | null;
}

export function WatchStreakCard({ streak }: WatchStreakCardProps) {
  if (!streak || streak.currentStreak === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Watch Streak</h2>
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-6 text-center">
          <Flame className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Start a streak by watching something today!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Watch Streak</h2>
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        {/* Background glow */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 shadow-lg shadow-orange-500/25">
            <Flame className="h-8 w-8 text-white" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{streak.currentStreak}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
        </div>

        {streak.longestStreak > streak.currentStreak && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
            <ArrowUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">
              Best: <span className="font-semibold text-foreground">{streak.longestStreak}</span> days
            </span>
          </div>
        )}

        {streak.lastWatchDate && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Last watched: {streak.lastWatchDate}
          </div>
        )}
      </div>
    </section>
  );
}