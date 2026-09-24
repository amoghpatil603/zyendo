import type { MediaItem } from "@/types/media-item";
import type { RecommendationReaction } from "@/types/recommendation-feedback";

export interface AiPick {
  media: MediaItem;
  why: string;
  reaction?: RecommendationReaction;
}

export interface AiPicksCacheRow {
  user_id: string;
  recommendations: AiPick[];
  generated_at: string;
  expires_at: string;
}
