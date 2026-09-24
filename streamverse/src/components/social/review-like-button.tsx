"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewLikeButtonProps {
  reviewId: string;
  isLiked: boolean;
  likeCount: number;
}

export function ReviewLikeButton({ reviewId, isLiked, likeCount }: ReviewLikeButtonProps) {
  const [liked, setLiked] = useState(isLiked);
  const [count, setCount] = useState(likeCount);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      if (liked) {
        const r = await mod.unlikeReview(reviewId);
        if (!r.ok) { toast.error(r.error); return; }
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        const r = await mod.likeReview(reviewId);
        if (!r.ok) { toast.error(r.error); return; }
        setLiked(true);
        setCount((c) => c + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "gap-1.5 text-xs",
        liked && "text-primary"
      )}
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <ThumbsUp className={cn("size-3.5", liked && "fill-current")} />
      )}
      {count}
    </Button>
  );
}
