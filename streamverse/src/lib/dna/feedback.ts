import type { RecommendationFeedbackRow } from "@/types/recommendation-feedback";

export interface DnaMediaReference {
  mediaType: string;
  mediaId: string;
}

/**
 * Converts explicit reactions into repeated DNA inputs. A dislike removes a
 * title from the profile; a like/love increases its influence two/threefold.
 */
export function applyRecommendationFeedbackToDna(
  watchlist: DnaMediaReference[],
  feedback: Pick<RecommendationFeedbackRow, "media_type" | "media_id" | "reaction">[],
): DnaMediaReference[] {
  const weights = new Map<string, number>();
  const references = new Map<string, DnaMediaReference>();

  for (const item of watchlist) {
    const key = `${item.mediaType}:${item.mediaId}`;
    weights.set(key, 1);
    references.set(key, item);
  }
  for (const item of feedback) {
    const key = `${item.media_type}:${item.media_id}`;
    references.set(key, { mediaType: item.media_type, mediaId: item.media_id });
    weights.set(key, item.reaction === "love" ? 3 : item.reaction === "like" ? 2 : 0);
  }

  return [...weights.entries()].flatMap(([key, weight]) => {
    const reference = references.get(key)!;
    return Array.from({ length: weight }, () => reference);
  });
}
