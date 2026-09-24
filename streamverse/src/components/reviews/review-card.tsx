import { UserRound } from "lucide-react";
import type { ReviewWithUser } from "@/types/review";
import { formatDate } from "@/lib/format";
import { StarRating } from "./star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ReviewCard({ review }: { review: ReviewWithUser }) {
  return (
    <div className="glass space-y-3 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-border">
            {review.userAvatarUrl && (
              <AvatarImage src={review.userAvatarUrl} alt={review.userDisplayName ?? "User"} className="object-cover" />
            )}
            <AvatarFallback>
              {review.userDisplayName?.charAt(0)?.toUpperCase() ?? <UserRound className="size-5" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {review.userDisplayName ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>
        <StarRating value={review.rating} readonly />
      </div>

      {review.body ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {review.body}
        </p>
      ) : null}
    </div>
  );
}