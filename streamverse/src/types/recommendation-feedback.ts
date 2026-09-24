export const RECOMMENDATION_REACTIONS = ["love", "like", "dislike"] as const;
export type RecommendationReaction = (typeof RECOMMENDATION_REACTIONS)[number];

export const RECOMMENDATION_SOURCES = ["ai_picks", "assistant", "watch_together"] as const;
export type RecommendationSource = (typeof RECOMMENDATION_SOURCES)[number];

export interface RecommendationFeedbackRow {
  user_id: string;
  media_type: string;
  media_id: string;
  source: RecommendationSource;
  reaction: RecommendationReaction;
  created_at: string;
}
