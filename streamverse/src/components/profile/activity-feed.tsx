"use client";

import type { UserActivity } from "@/types/profile";
import {
  Clock,
  Star,
  BookOpen,
  Trophy,
  Library,
  Target,
  Flame,
} from "lucide-react";
import { formatDate } from "@/lib/format";

interface ActivityFeedProps {
  activities: UserActivity[];
}

const activityConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  watched: {
    icon: Clock,
    label: "Watched",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  reviewed: {
    icon: BookOpen,
    label: "Reviewed",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  rated: {
    icon: Star,
    label: "Rated",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  achievement: {
    icon: Trophy,
    label: "Achievement",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  added_to_collection: {
    icon: Library,
    label: "Added to Collection",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  completed_goal: {
    icon: Target,
    label: "Goal Completed",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  watch_streak: {
    icon: Flame,
    label: "Streak",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities.length) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-8 text-center">
          <Clock className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No activity yet. Start watching to build your history!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity) => {
          const config = activityConfig[activity.activityType] ?? activityConfig.watched;
          const Icon = config.icon;
          const title =
            (activity.metadata as { title?: string } | null)?.title ?? "Unknown";

          return (
            <div
              key={activity.id}
              className="glass flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className={`rounded-full p-2 ${config.bg}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  <span className="text-muted-foreground">{config.label}</span>{" "}
                  {title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(activity.createdAt) ?? "Just now"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}