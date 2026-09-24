"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Star, MessageSquare, Trash2, Edit3, Search, SortAsc } from "lucide-react";
import type { Review } from "@/types/review";
import { ReviewCard } from "./review-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReviewsClientProps {
  userId: string;
}

type Tab = "my-reviews" | "liked" | "history";
type SortBy = "recent" | "oldest" | "highest" | "lowest";
type MediaTypeFilter = "all" | "movie" | "tv" | "anime";

const TABS: { key: Tab; label: string }[] = [
  { key: "my-reviews", label: "My Reviews" },
  { key: "liked", label: "Liked Reviews" },
  { key: "history", label: "Review History" },
];

export function ReviewsClient({ userId }: ReviewsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("my-reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [mediaFilter, setMediaFilter] = useState<MediaTypeFilter>("movie");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/app/actions/reviews");
      let result;
      
      switch (activeTab) {
        case "my-reviews":
          result = await mod.getMyReviewsAction();
          break;
        case "liked":
          result = await mod.getLikedReviewsAction();
          break;
        case "history":
          result = await mod.getMyReviewsAction();
          break;
        default:
          result = await mod.getMyReviewsAction();
      }

      if (result.ok) {
        setReviews(result.reviews);
      } else {
        toast.error("Failed to load reviews");
      }
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    
    try {
      const mod = await import("@/app/actions/reviews");
      const result = await mod.deleteReviewAction({ reviewId });
      if (result.ok) {
        toast.success("Review deleted");
        loadReviews();
      } else {
        toast.error("Failed to delete review");
      }
    } catch {
      toast.error("Failed to delete review");
    }
  };

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter((review) => {
      if (mediaFilter !== "all" && review.mediaType !== mediaFilter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        review.mediaId.toLowerCase().includes(query) ||
        review.body.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "highest":
          return b.rating - a.rating;
        case "lowest":
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Manage and discover reviews
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.key
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={mediaFilter} onValueChange={(v: MediaTypeFilter) => setMediaFilter(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movie">Movies</SelectItem>
              <SelectItem value="tv">TV Shows</SelectItem>
              <SelectItem value="anime">Anime</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: SortBy) => setSortBy(v)}>
            <SelectTrigger className="w-[140px]">
              <SortAsc className="mr-2 size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review.id} className="relative">
              <ReviewCard review={review} />
              {activeTab === "my-reviews" && (
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full"
                    onClick={() => {
                      toast.info("Edit functionality coming soon");
                    }}
                  >
                    <Edit3 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-destructive hover:text-destructive"
                    onClick={() => handleDelete(review.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No reviews found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search query"
              : "Reviews will appear here once you start writing them"}
          </p>
        </div>
      )}
    </div>
  );
}