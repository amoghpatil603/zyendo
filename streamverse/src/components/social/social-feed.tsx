"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, Eye, MessageSquare, Library, Award, Star, TrendingUp, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SocialActivity } from "@/types/social";

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  watched: Eye,
  reviewed: MessageSquare,
  added_to_collection: Library,
  achievement: Award,
  rated: Star,
  completed_goal: TrendingUp,
  watch_streak: Clock,
};

const defaultIcon = Activity;

interface SocialFeedProps {
  limit?: number;
  showTitle?: boolean;
}

export function SocialFeed({ limit = 30, showTitle = true }: SocialFeedProps) {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      const data = await mod.getSocialFeed(limit);
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {showTitle && <h2 className="text-lg font-semibold">Activity Feed</h2>}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse glass rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-3 w-48 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="glass rounded-2xl border border-border/60 p-8 text-center">
        {showTitle && <h2 className="mb-4 text-lg font-semibold">Activity Feed</h2>}
        <Activity className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No activity yet. Follow users to see their activity here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && <h2 className="text-lg font-semibold">Activity Feed</h2>}
      {activities.map((a) => {
        const Icon = activityIcons[a.activityType] ?? defaultIcon;
        return (
          <Link
            key={a.id}
            href={`/users/${a.userId}`}
            className="flex items-start gap-3 rounded-xl border border-border/60 glass p-4 transition hover:border-primary/30"
          >
            <Avatar className="size-9">
              <AvatarFallback>
                {a.displayName?.charAt(0)?.toUpperCase() ?? <User className="size-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{a.displayName ?? "Anonymous"}</span>
                {" "}
                <span className="text-muted-foreground capitalize">{a.activityType.replace(/_/g, " ")}</span>
                {a.mediaType && (
                  <span className="text-muted-foreground">
                    {" "}· <span className="uppercase text-xs">{a.mediaType}</span>
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon className="size-4" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
