import { describe, expect, it } from "vitest";

import { computeSharedQueueScore, rankSharedQueueItems } from "@/lib/watch-together-queue";

function view(item: Partial<Parameters<typeof rankSharedQueueItems>[0][number]> & { id: string }) {
  // Provide the minimal required fields for rankSharedQueueItems.
  return {
    id: item.id,
    sessionId: "s1",
    mediaType: "movie" as const,

    mediaId: "m1",
    title: item.title ?? "t",
    poster: null,
    suggestedBy: "u1",
    suggestedByDisplayName: null,
    createdAt: item.createdAt ?? new Date("2020-01-01T00:00:00Z").toISOString(),
    upvotes: item.upvotes ?? 0,
    downvotes: item.downvotes ?? 0,
    score: item.score ?? computeSharedQueueScore(item.upvotes ?? 0, item.downvotes ?? 0),
    currentUserVote: (item as any).currentUserVote ?? 0,
    selected: Boolean(item.selected),
  };
}

describe("watch-together queue helpers", () => {
  it("computeSharedQueueScore(up,down) returns up-down", () => {
    expect(computeSharedQueueScore(10, 3)).toBe(7);
    expect(computeSharedQueueScore(0, 3)).toBe(-3);
  });

  it("rankSharedQueueItems: deterministic order by score desc, upvotes desc, created_at asc, id tie-break", () => {
    const items = [
      view({ id: "a", title: "A", upvotes: 5, downvotes: 1, createdAt: "2020-01-02T00:00:00Z" }), // score 4
      view({ id: "b", title: "B", upvotes: 6, downvotes: 2, createdAt: "2020-01-01T00:00:00Z" }), // score 4, higher upvotes
      view({ id: "c", title: "C", upvotes: 5, downvotes: 1, createdAt: "2020-01-01T00:00:00Z" }), // score 4 same upvotes tie by created_at
      view({ id: "d", title: "D", upvotes: 10, downvotes: 9, createdAt: "2019-01-01T00:00:00Z" }), // score 1
    ];

    const ranked = rankSharedQueueItems(items);
    expect(ranked.map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
    expect(ranked[0].rank).toBe(1);
  });
});

