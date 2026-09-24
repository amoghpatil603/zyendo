import type { ReviewWithUser, ReviewsStats } from "@/types/review";
import { ReviewCard } from "./review-card";

export function ReviewList({
  reviews,
  stats,
  children,
}: {
  reviews: ReviewWithUser[];
  stats: ReviewsStats;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">Reviews</h2>
        {stats.averageRating !== null ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {stats.averageRating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">
              / 10 ({stats.reviewCount})
            </span>
          </div>
        ) : null}
      </div>

      {children}

      {reviews.length > 0 ? (
        <div className="grid gap-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      )}
    </section>
  );
}