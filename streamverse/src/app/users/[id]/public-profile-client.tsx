"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Film, Star, Dna, Award, Clock, Heart, Activity, MessageSquare,
  Library, TrendingUp, Eye,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicProfile, ReviewWithInteraction, CollectionWithInteraction } from "@/types/social";
import { FollowButton } from "@/components/social/follow-button";
import { ReviewLikeButton } from "@/components/social/review-like-button";
import { CollectionLikeButton } from "@/components/social/collection-like-button";
import { CommentThread } from "@/components/social/comment-thread";

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="glass rounded-xl border border-border/60 p-3 text-center">
      <Icon className="mx-auto mb-1 size-4 text-primary" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Item
// ---------------------------------------------------------------------------

function ActivityItem({ activity }: { activity: PublicProfile["recentActivity"][0] }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    watched: Eye, reviewed: MessageSquare, added_to_collection: Library,
    achievement: Award, rated: Star, completed_goal: TrendingUp, watch_streak: Clock,
  };
  const Icon = icons[activity.activityType] ?? Activity;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 glass p-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm capitalize">{activity.activityType.replace(/_/g, " ")}</p>
        <p className="text-xs text-muted-foreground">
          {activity.mediaType && <span className="uppercase">{activity.mediaType}</span>}
          {activity.mediaId && <span> · {activity.mediaId.slice(0, 8)}</span>}
          <span> · {new Date(activity.createdAt).toLocaleDateString()}</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Card
// ---------------------------------------------------------------------------

function ReviewCard({ review }: { review: ReviewWithInteraction }) {
  return (
    <div className="glass rounded-xl border border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="uppercase text-xs">{review.mediaType}</span>
            <span>·</span>
            <span>{review.mediaId.slice(0, 8)}</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-3.5",
                  i < Math.round(review.rating / 2) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"
                )}
              />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">{review.rating}/10</span>
          </div>
          {review.body && <p className="mt-2 text-sm line-clamp-3">{review.body}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-border/40 pt-3">
        <ReviewLikeButton reviewId={review.id} isLiked={review.isLiked} likeCount={review.likeCount} />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          {review.commentCount}
        </span>
      </div>
      <CommentThread reviewId={review.id} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collection Card
// ---------------------------------------------------------------------------

function CollectionCard({ collection }: { collection: CollectionWithInteraction }) {
  return (
    <div className="glass rounded-xl border border-border/60 p-4 transition hover:border-primary/30">
      <Link href={`/collections/${collection.id}`} className="block">
        <h3 className="font-semibold">{collection.name}</h3>
        {collection.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{collection.description}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {collection.itemCount} {collection.itemCount === 1 ? "title" : "titles"}
        </p>
      </Link>
      <div className="mt-3 border-t border-border/40 pt-3">
        <CollectionLikeButton collectionId={collection.id} isLiked={collection.isLiked} likeCount={collection.likeCount} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Profile Client
// ---------------------------------------------------------------------------

export function PublicProfileClient({ initialProfile, userId }: { initialProfile: PublicProfile; userId: string }) {
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState("activity");
  const [reviews, setReviews] = useState<ReviewWithInteraction[] | null>(null);
  const [collections, setCollections] = useState<CollectionWithInteraction[] | null>(null);
  const [loadingTab, setLoadingTab] = useState(false);

  const refreshProfile = useCallback(async () => {
    const mod = await import("@/lib/social/social-actions");
    const p = await mod.getPublicProfile(userId);
    if (p) setProfile(p);
  }, [userId]);

  const loadReviews = useCallback(async () => {
    setLoadingTab(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      const data = await mod.getUserReviewsWithInteraction(userId);
      setReviews(data);
    } finally {
      setLoadingTab(false);
    }
  }, [userId]);

  const loadCollections = useCallback(async () => {
    setLoadingTab(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      const data = await mod.getUserCollectionsWithInteraction(userId);
      setCollections(data);
    } finally {
      setLoadingTab(false);
    }
  }, [userId]);

  function handleTabChange(key: string) {
    setActiveTab(key);
    if (key === "reviews" && reviews === null) loadReviews();
    if (key === "collections" && collections === null) loadCollections();
  }

  const tabs = [
    { key: "activity", label: "Activity", icon: Activity },
    { key: "reviews", label: "Reviews", icon: MessageSquare },
    { key: "collections", label: "Collections", icon: Library },
    { key: "stats", label: "Stats", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="glass rounded-2xl border border-border/60 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-bold text-white shadow-xl">
            {profile.displayName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">{profile.displayName ?? "Anonymous"}</h1>
                <p className="text-sm text-muted-foreground">
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
              <FollowButton
                userId={profile.id}
                isFollowing={profile.isFollowing}
                isOwnProfile={profile.isOwnProfile}
                onToggle={refreshProfile}
              />
            </div>

            {/* Followers/Following */}
            <div className="mt-4 flex items-center justify-center gap-6 sm:justify-start">
              <button className="text-sm transition hover:text-primary">
                <span className="font-bold">{profile.followerCount}</span>
                <span className="ml-1 text-muted-foreground">Followers</span>
              </button>
              <button className="text-sm transition hover:text-primary">
                <span className="font-bold">{profile.followingCount}</span>
                <span className="ml-1 text-muted-foreground">Following</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Film} label="Reviews" value={profile.stats.reviewsCount} />
        <Stat icon={Library} label="Collections" value={profile.stats.collectionsCount} />
        <Stat icon={Heart} label="Watchlist" value={profile.stats.watchlistCount} />
        <Stat icon={Award} label="Achievements" value={profile.stats.achievementsCount} />
      </div>

      {/* DNA */}
      {profile.topGenres.length > 0 && (
        <div className="glass rounded-2xl border border-border/60 p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Dna className="size-4 text-primary" />
            Entertainment DNA
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.topGenres.map((g, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border/60 glass p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
                activeTab === tab.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => handleTabChange(tab.key)}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <div className="space-y-3">
          {profile.recentActivity.length === 0 ? (
            <div className="glass rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
              No recent activity.
            </div>
          ) : (
            profile.recentActivity.map((a) => <ActivityItem key={a.id} activity={a} />)
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="space-y-3">
          {loadingTab ? (
            <div className="flex justify-center py-8">
              <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : reviews && reviews.length > 0 ? (
            reviews.map((r) => <ReviewCard key={r.id} review={r} />)
          ) : (
            <div className="glass rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 size-8" />
              No reviews yet.
            </div>
          )}
        </div>
      )}

      {/* Collections Tab */}
      {activeTab === "collections" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {loadingTab ? (
            <div className="col-span-full flex justify-center py-8">
              <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : collections && collections.length > 0 ? (
            collections.map((c) => <CollectionCard key={c.id} collection={c} />)
          ) : (
            <div className="col-span-full glass rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
              <Library className="mx-auto mb-2 size-8" />
              No public collections yet.
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass rounded-2xl border border-border/60 p-5 text-center">
            <Film className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-2xl font-bold">{profile.stats.reviewsCount}</p>
            <p className="text-xs text-muted-foreground">Reviews Written</p>
          </div>
          <div className="glass rounded-2xl border border-border/60 p-5 text-center">
            <Library className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-2xl font-bold">{profile.stats.collectionsCount}</p>
            <p className="text-xs text-muted-foreground">Collections</p>
          </div>
          <div className="glass rounded-2xl border border-border/60 p-5 text-center">
            <Heart className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-2xl font-bold">{profile.stats.watchlistCount}</p>
            <p className="text-xs text-muted-foreground">Watchlist</p>
          </div>
          <div className="glass rounded-2xl border border-border/60 p-5 text-center">
            <Award className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-2xl font-bold">{profile.stats.achievementsCount}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </div>
          <div className="glass rounded-2xl border border-border/60 p-5 text-center sm:col-span-2">
            <Dna className="mx-auto mb-2 size-6 text-primary" />
            <div className="flex flex-wrap justify-center gap-2">
              {profile.topGenres.length > 0 ? profile.topGenres.map((g, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{g.name}</span>
              )) : <span className="text-sm text-muted-foreground">No DNA data</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
