"use client";

import { useState, useTransition } from "react";
import { Share2, Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// import { toggleCollectionLikeAction } from "@/app/actions/collections"; // (Will implement this action if it doesn't exist)

export function CollectionActions({
  collectionId,
  initialLiked = false,
  likeCount = 0,
  isOwner,
  isPublic,
}: {
  collectionId: string;
  initialLiked?: boolean;
  likeCount?: number;
  isOwner: boolean;
  isPublic: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);
  const [isPending, startTransition] = useTransition();

  function handleShare() {
    if (!isPublic && !isOwner) {
      toast.error("This collection is private.");
      return;
    }
    const url = `${window.location.origin}/collections/${collectionId}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link."));
  }

  function handleLike() {
    // Optimistic
    const newLiked = !liked;
    setLiked(newLiked);
    setOptimisticCount((prev) => (newLiked ? prev + 1 : prev - 1));

    startTransition(async () => {
      // TODO: Call server action
      // const res = await toggleCollectionLikeAction({ collectionId });
      // if (!res.ok) {
      //   setLiked(!newLiked);
      //   setOptimisticCount((prev) => (!newLiked ? prev + 1 : prev - 1));
      //   toast.error("Failed to update like status.");
      // }
    });
  }

  return (
    <div className="flex items-center gap-2 mt-4 sm:mt-0">
      <Button variant="outline" size="sm" onClick={handleLike} disabled={isOwner || isPending}>
        <Heart className={cn("size-4 mr-2", liked && "fill-destructive text-destructive")} />
        {optimisticCount}
      </Button>
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 className="size-4 mr-2" />
        Share
      </Button>
    </div>
  );
}
