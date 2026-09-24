"use client";

import { useState } from "react";
import { UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  isOwnProfile: boolean;
  onToggle: () => void;
}

export function FollowButton({ userId, isFollowing, isOwnProfile, onToggle }: FollowButtonProps) {
  const [loading, setLoading] = useState(false);

  if (isOwnProfile) return null;

  async function handleClick() {
    setLoading(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      if (isFollowing) {
        const r = await mod.unfollowUser(userId);
        if (!r.ok) { toast.error(r.error); return; }
      } else {
        const r = await mod.followUser(userId);
        if (!r.ok) { toast.error(r.error); return; }
      }
      onToggle();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={isFollowing ? "secondary" : "default"}
      className="gap-2"
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : isFollowing ? (
        <Check className="size-4" />
      ) : (
        <UserPlus className="size-4" />
      )}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
