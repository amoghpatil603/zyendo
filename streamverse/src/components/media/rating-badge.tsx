import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/format";

export function RatingBadge({
  voteAverage,
  className,
}: {
  voteAverage?: number;
  className?: string;
}) {
  const rating = formatRating(voteAverage);
  if (!rating) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm",
        className,
      )}
    >
      <Star className="size-3 fill-yellow-400 text-yellow-400" />
      {rating}
    </span>
  );
}
