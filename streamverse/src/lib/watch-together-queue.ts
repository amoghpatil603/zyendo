import type { MediaType } from "@/types/media-item";

export type SharedQueueVoteValue = 1 | -1;

export type SharedQueueItemMediaType = "movie" | "tv" | "anime";

export interface SharedQueueItem {
  id: string;
  sessionId: string;
  mediaType: SharedQueueItemMediaType;
  mediaId: string;
  title: string;
  poster: string | null;
  suggestedBy: string;
  suggestedByDisplayName?: string | null;
  createdAt: string;
}

export interface SharedQueueItemAggregates {
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface SharedQueueVote {
  id: string;
  queueItemId: string;
  userId: string;
  vote: SharedQueueVoteValue;
  createdAt: string;
}

export interface SharedQueueItemView extends SharedQueueItem, SharedQueueItemAggregates {
  currentUserVote: SharedQueueVoteValue | 0;
  selected: boolean;
}

export interface SharedQueueRanking {
  item: SharedQueueItemView;
  rank: number;
}

export interface RankedSharedQueueItem extends SharedQueueItemView {
  rank: number;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

export function computeSharedQueueScore(upvotes: number, downvotes: number): number {
  return upvotes - downvotes;
}

/**
 * Deterministic shared queue ranking (WT-4).
 * 1) score DESC
 * 2) upvotes DESC
 * 3) createdAt ASC
 * 4) id ASC
 */
export function rankSharedQueueItems(items: SharedQueueItemView[]): RankedSharedQueueItem[] {
  return [...items]
    .sort((a, b) => {
      const scoreCmp = b.score - a.score;
      if (scoreCmp !== 0) return scoreCmp;
      const upCmp = b.upvotes - a.upvotes;
      if (upCmp !== 0) return upCmp;

      const createdCmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdCmp !== 0) return createdCmp;

      return a.id.localeCompare(b.id);
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

export function assertMediaType(input: string): asserts input is MediaType {
  if (!(["movie", "tv", "anime"] as const).includes(input as any)) {
    throw new Error(`Invalid media type: ${input}`);
  }
}

export function normalizePoster(posterUrl: unknown): string | null {
  if (typeof posterUrl === "string") return posterUrl;
  return null;
}

export function normalizeCreatedAt(createdAt: unknown): string {
  if (typeof createdAt === "string") return createdAt;
  if (createdAt instanceof Date) return createdAt.toISOString();
  return new Date().toISOString();
}

