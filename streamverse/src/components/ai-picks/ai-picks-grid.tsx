import { MediaCard } from "@/components/media/media-card";
import type { AiPick } from "@/types/ai-picks";
import type { RecommendationReaction } from "@/types/recommendation-feedback";
import { ReactionControls } from "./reaction-controls";

export function AiPicksGrid({ recommendations, onReaction }: { recommendations: AiPick[]; onReaction: (mediaKey: string, reaction: RecommendationReaction) => void }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {recommendations.map((pick) => <article key={`${pick.media.type}:${pick.media.externalId}`} className="glass overflow-hidden rounded-2xl border border-border/60"><MediaCard item={pick.media} className="rounded-b-none border-x-0 border-t-0" /><div className="space-y-3 p-4"><div className="space-y-1"><h2 className="text-sm font-semibold">Why this?</h2><p className="text-sm text-muted-foreground">{pick.why}</p></div><ReactionControls mediaType={pick.media.type} mediaId={pick.media.externalId} reaction={pick.reaction} onChange={(reaction) => onReaction(`${pick.media.type}:${pick.media.externalId}`, reaction)} /></div></article>)}
  </div>;
}
