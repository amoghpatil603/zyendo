import { getCurrentUser } from "@/lib/supabase/server";
import { getReviewsForMedia, getMyReview } from "@/app/actions/reviews";
import { ReviewList } from "./review-list";
import { ReviewForm } from "./review-form";

export async function ReviewsSection({
  mediaType,
  mediaId,
}: {
  mediaType: string;
  mediaId: string;
}) {
  const [user, reviewsResult, myReview] = await Promise.all([
    getCurrentUser(),
    getReviewsForMedia(mediaType, mediaId),
    getMyReview(mediaType, mediaId),
  ]);

  if (!reviewsResult.ok) {
    return null;
  }

  const isAuthenticated = Boolean(user);

  return (
    <ReviewList reviews={reviewsResult.reviews} stats={reviewsResult.stats}>
      <ReviewForm
        mediaType={mediaType}
        mediaId={mediaId}
        initialReview={myReview ?? null}
        isAuthenticated={isAuthenticated}
      />
    </ReviewList>
  );
}