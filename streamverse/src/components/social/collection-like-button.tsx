"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollectionLikeButtonProps {
  collectionId: string;
  isLiked: boolean;
  likeCount: number;
}

export function CollectionLikeButton({ collectionId, isLiked, likeCount }: CollectionLikeButtonProps) {
  const [liked, setLiked] = useState(isLiked);
  const [count, setCount] = useState(likeCount);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      if (liked) {
        const r = await mod.unlikeCollection(collectionId);
        if (!r.ok) { toast.error(r.error); return; }
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        const r = await mod.likeCollection(collectionId);
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
        liked && "text-red-500"
      )}
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Heart className={cn("size-3.5", liked && "fill-current")} />
      )}
      {count}
    </Button>
  );
}
