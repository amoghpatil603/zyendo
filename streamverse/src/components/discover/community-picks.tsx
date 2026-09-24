"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Users, Library, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { CollectionWithInteraction, UserSearchResult, SocialActivity } from "@/types/social";

export function CommunityPicks() {
  const [data, setData] = useState<{
    likedReviews: SocialActivity[];
    savedCollections: CollectionWithInteraction[];
    followedUsers: UserSearchResult[];
    recentPopular: SocialActivity[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/discovery/feed-actions");
      const d = await mod.getCommunityPicksSection();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Heart className="size-5 text-primary" />
        Community Picks
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Most Liked Reviews */}
        {data.likedReviews.length > 0 && (
          <div className="glass rounded-xl border border-border/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="size-4 text-primary" />
              Liked Reviews
            </h3>
            <div className="space-y-2">
              {data.likedReviews.map((a) => (
                <Link key={a.id} href={`/users/${a.userId}`} className="flex items-center gap-2 text-sm hover:text-primary transition">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{a.displayName?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{a.displayName ?? "Anonymous"}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Saved Collections */}
        {data.savedCollections.length > 0 && (
          <div className="glass rounded-xl border border-border/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Library className="size-4 text-primary" />
              Saved Collections
            </h3>
            <div className="space-y-2">
              {data.savedCollections.map((c) => (
                <Link key={c.id} href={`/collections/${c.id}`} className="flex items-center gap-2 text-sm hover:text-primary transition">
                  <Library className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{c.likeCount} ❤</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Most Followed Users */}
        {data.followedUsers.length > 0 && (
          <div className="glass rounded-xl border border-border/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-primary" />
              Most Followed
            </h3>
            <div className="space-y-2">
              {data.followedUsers.map((u) => (
                <Link key={u.id} href={`/users/${u.id}`} className="flex items-center gap-2 text-sm hover:text-primary transition">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{u.displayName?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{u.displayName ?? "Anonymous"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{u.followerCount} followers</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recently Popular */}
        {data.recentPopular.length > 0 && (
          <div className="glass rounded-xl border border-border/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" />
              Recently Popular
            </h3>
            <div className="space-y-2">
              {data.recentPopular.slice(0, 5).map((a) => (
                <Link key={a.id} href={`/users/${a.userId}`} className="flex items-center gap-2 text-sm hover:text-primary transition">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{a.displayName?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{a.displayName ?? "Anonymous"}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">{a.activityType.replace(/_/g, " ")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
