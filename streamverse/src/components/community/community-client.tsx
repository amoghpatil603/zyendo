"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, MessageSquare, Library, TrendingUp, Heart, Eye, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { UserSearchResult, CollectionWithInteraction, SocialActivity } from "@/types/social";
import type { Review } from "@/types/review";

export function CommunityClient({
  trendingUsers,
  popularCollections,
  recentReviews,
  recentActivity,
}: {
  trendingUsers: UserSearchResult[];
  popularCollections: CollectionWithInteraction[];
  recentReviews: (Review & { userDisplayName?: string; userAvatarUrl?: string })[];
  recentActivity: SocialActivity[];
}) {
  const [users, setUsers] = useState(trendingUsers);
  const [collections, setCollections] = useState(popularCollections);
  const [reviews, setReviews] = useState(recentReviews);
  const [activities, setActivities] = useState(recentActivity);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Users className="size-6 text-primary" />
          Community
        </h1>
        <p className="text-sm text-muted-foreground">
          Discover what the Zynora community is watching, reviewing, and collecting.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main feed — 2/3 width */}
        <div className="space-y-8 lg:col-span-2">
          {/* Community Feed */}
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="size-5 text-primary" />
              Community Feed
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3 transition hover:bg-muted/30">
                    <Avatar className="size-8 shrink-0">
                      {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.displayName ?? "User"} className="object-cover" />}
                      <AvatarFallback>{a.displayName?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{a.displayName ?? "Anonymous"}</span>
                        <span className="text-muted-foreground"> {a.activityType.replace(/_/g, " ")}</span>
                      </p>
                      {(a.mediaType || a.mediaId) && (
                        <p className="text-xs text-muted-foreground">
                          {a.mediaType} {a.mediaId ? `· ${a.mediaId}` : ""}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Reviews */}
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Star className="size-5 text-primary" />
              Recent Reviews
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 10).map((r) => (
                  <div key={r.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          {r.userAvatarUrl && <AvatarImage src={r.userAvatarUrl} alt={r.userDisplayName ?? "User"} className="object-cover" />}
                          <AvatarFallback className="text-[10px]">{r.userDisplayName?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{r.userDisplayName ?? `User ${r.userId.slice(0, 8)}`}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.mediaType} · {r.mediaId}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.body}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>⭐ {r.rating}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar — 1/3 width */}
        <div className="space-y-6">
          {/* Trending Members */}
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="size-4 text-primary" />
              Trending Members
            </h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="space-y-2">
                {users.slice(0, 8).map((u) => (
                  <Link
                    key={u.id}
                    href={`/users/${u.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5 transition hover:border-primary/30"
                  >
                    <Avatar className="size-8">
                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.displayName ?? "User"} className="object-cover" />}
                      <AvatarFallback>{u.displayName?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.displayName ?? "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.followerCount} {u.followerCount === 1 ? "follower" : "followers"}
                      </p>
                    </div>
                    <TrendingUp className="size-4 text-primary shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Who to Follow */}
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Users className="size-4 text-primary" />
              Who to Follow
            </h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggestions yet.</p>
            ) : (
              <div className="space-y-2">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5">
                    <Avatar className="size-8">
                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.displayName ?? "User"} className="object-cover" />}
                      <AvatarFallback>{u.displayName?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.displayName ?? "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{u.collectionCount} collections · {u.reviewCount} reviews</p>
                    </div>
                    <Button size="sm" variant="secondary" className="h-7 text-xs">Follow</Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Popular Collections */}
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Library className="size-4 text-primary" />
              Popular Collections
            </h2>
            {collections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No public collections yet.</p>
            ) : (
              <div className="space-y-2">
                {collections.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.id}`}
                    className="flex items-start gap-3 rounded-xl border border-border/60 p-2.5 transition hover:border-primary/30"
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
            )}
          </section>

          {/* Recent Activity */}
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Eye className="size-4 text-primary" />
              Recent Activity
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 rounded-xl p-2">
                    <Avatar className="size-7 shrink-0">
                      {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.displayName ?? "User"} className="object-cover" />}
                      <AvatarFallback className="text-[10px]">{a.displayName?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-medium">{a.displayName ?? "Anonymous"}</span>
                        <span className="text-muted-foreground"> {a.activityType.replace(/_/g, " ")}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
