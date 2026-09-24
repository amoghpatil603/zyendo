import type { ReviewsStats } from "@/types/review";

export function computeReviewStats(reviews: { rating: number }[]): ReviewsStats {
  if (reviews.length === 0) {
    return { averageRating: null, reviewCount: 0 };
  }

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return {
    averageRating: sum / reviews.length,
    reviewCount: reviews.length,
  };
}