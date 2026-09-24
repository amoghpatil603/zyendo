"use client";

import type { UserAchievement } from "@/types/profile";
import { Trophy, Award } from "lucide-react";
import { formatDate } from "@/lib/format";

interface AchievementsPreviewProps {
  achievements: UserAchievement[];
}

const categoryColors: Record<string, string> = {
  milestone: "from-amber-500 to-yellow-500",
  genre: "from-violet-500 to-purple-500",
  social: "from-sky-500 to-blue-500",
  streak: "from-orange-500 to-rose-500",
  special: "from-emerald-500 to-teal-500",
};

export function AchievementsPreview({ achievements }: AchievementsPreviewProps) {
  if (!achievements.length) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Achievements</h2>
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-6 text-center">
          <Award className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Unlock achievements by watching and exploring!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Achievements</h2>
      <div className="space-y-3">
        {achievements.map((ua) => {
          const ach = ua.achievement;
          if (!ach) return null;

          const gradient = categoryColors[ach.category] ?? "from-primary to-accent";

          return (
            <div
              key={ua.id}
              className="glass group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:shadow-md"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg transition-transform duration-200 group-hover:scale-110`}
              >
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ach.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(ua.unlockedAt) ?? "Recently"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}