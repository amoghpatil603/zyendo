"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StarRating } from "./star-rating";
import { upsertReview, deleteReview } from "@/app/actions/reviews";
import type { Review } from "@/types/review";

export function ReviewForm({
  mediaType,
  mediaId,
  initialReview,
  isAuthenticated,
}: {
  mediaType: string;
  mediaId: string;
  initialReview?: Review | null;
  isAuthenticated: boolean;
}) {
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [body, setBody] = useState(initialReview?.body ?? "");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
        Sign in to write a review.
      </div>
    );
  }

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    startTransition(async () => {
      const result = await upsertReview(mediaType, mediaId, rating, body.trim());
      if (result.ok) {
        toast.success(initialReview ? "Review updated." : "Review posted.");
      } else {
        toast.error("Couldn't save review. Try again.");
      }
    });
  }

  async function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteReview(mediaType, mediaId);
      if (result.ok) {
        setRating(0);
        setBody("");
        toast.success("Review removed.");
      } else {
        toast.error("Couldn't remove review. Try again.");
      }
    });
  }

  return (
    <div className="glass space-y-3 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {initialReview ? "Your review" : "Write a review"}
        </span>
        {initialReview ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
        ) : null}
      </div>

      <StarRating value={rating} onChange={setRating} />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think?"
        rows={3}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || rating === 0}
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {initialReview ? "Update review" : "Post review"}
        </Button>
      </div>
    </div>
  );
}