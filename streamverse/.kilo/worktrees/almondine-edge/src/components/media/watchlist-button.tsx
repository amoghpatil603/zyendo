"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleWatchlist } from "@/app/actions/watchlist";

interface WatchlistButtonProps {
  mediaType: string;
  mediaId: string;
  initialInWatchlist: boolean;
  isAuthenticated: boolean;
  variant?: "default" | "icon";
  className?: string;
}

export function WatchlistButton({
  mediaType,
  mediaId,
  initialInWatchlist,
  isAuthenticated,
  variant = "default",
  className,
}: WatchlistButtonProps) {
  const router = useRouter();
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      toast.info("Sign in to save titles to your watchlist.");
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    startTransition(async () => {
      const optimistic = !inWatchlist;
      setInWatchlist(optimistic);
      const result = await toggleWatchlist(mediaType, mediaId);
      if (!result.ok) {
        setInWatchlist(!optimistic);
        if (result.error === "unauthenticated") {
          toast.error("Your session expired. Please sign in again.");
          router.push("/login");
        } else {
          toast.error("Couldn't update your watchlist. Try again.");
        }
        return;
      }
      setInWatchlist(result.added);
      toast.success(
        result.added ? "Added to your watchlist." : "Removed from your watchlist.",
      );
    });
  }

  const Icon = isPending
    ? Loader2
    : inWatchlist
      ? BookmarkCheck
      : Bookmark;

  if (variant === "icon") {
    return (
      <Button
        type="button"
        size="icon"
        variant={inWatchlist ? "default" : "secondary"}
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={inWatchlist}
        aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        className={cn("rounded-full", className)}
      >
        <Icon className={cn("size-4", isPending && "animate-spin")} />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={inWatchlist ? "default" : "secondary"}
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={inWatchlist}
      className={className}
    >
      <Icon className={cn("size-4", isPending && "animate-spin")} />
      {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
    </Button>
  );
}
