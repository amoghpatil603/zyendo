"use client";

import { Heart, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { setRecommendationFeedback } from "@/app/actions/recommendation-feedback";
import { Button } from "@/components/ui/button";
import type { RecommendationReaction } from "@/types/recommendation-feedback";

const reactions: { value: RecommendationReaction; label: string; icon: typeof Heart }[] = [
  { value: "love", label: "Love", icon: Heart },
  { value: "like", label: "Like", icon: ThumbsUp },
  { value: "dislike", label: "Dislike", icon: ThumbsDown },
];

export function ReactionControls({ mediaType, mediaId, reaction, onChange }: { mediaType: string; mediaId: string; reaction?: RecommendationReaction; onChange: (reaction: RecommendationReaction) => void }) {
  const [pending, startTransition] = useTransition();
  return <div className="flex flex-wrap gap-1" role="group" aria-label="Rate this recommendation">
    {reactions.map(({ value, label, icon: Icon }) => <Button key={value} type="button" size="sm" variant={reaction === value ? "default" : "ghost"} disabled={pending} onClick={() => startTransition(async () => {
      const result = await setRecommendationFeedback(mediaType, mediaId, "ai_picks", value);
      if (result.ok) { onChange(result.reaction); toast.success(`${label} saved.`); }
      else toast.error("Couldn't save your reaction. Try again.");
    })} aria-pressed={reaction === value} title={label}>
      <Icon className="size-4" /> <span>{label}</span>
    </Button>)}
  </div>;
}
