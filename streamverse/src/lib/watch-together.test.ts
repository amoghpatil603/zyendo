import { describe, expect, it } from "vitest";

import { normalizeResponses, rankSuggestions, suggestionKey, toggleVote } from "./watch-together";
import type { WatchTogetherParticipant } from "@/types/watch-together";

const participant = (id: string, suggestions: string[], votes: string[]): WatchTogetherParticipant => ({
  id, userId: id, displayName: id, isReady: false, joinedAt: "2026-01-01T00:00:00Z",
  responses: { suggestions: suggestions.map((mediaId) => ({ key: suggestionKey("movie", mediaId), mediaType: "movie", mediaId, title: `Movie ${mediaId}`, coverImageUrl: null, addedBy: id })), votes },
});

describe("Watch Together domain helpers", () => {
  it("creates stable suggestion keys", () => expect(suggestionKey("tv", "42")).toBe("tv:42"));
  it("normalizes missing participant responses", () => expect(normalizeResponses(null)).toEqual({ suggestions: [], votes: [] }));
  it("toggles one participant vote without duplication", () => {
    expect(toggleVote({ suggestions: [], votes: [] }, "movie:1").votes).toEqual(["movie:1"]);
    expect(toggleVote({ suggestions: [], votes: ["movie:1"] }, "movie:1").votes).toEqual([]);
  });
  it("ranks by unique participant votes, then rating/title", () => {
    const ranked = rankSuggestions([
      participant("a", ["1", "2"], ["movie:1", "movie:1"]),
      participant("b", [], ["movie:1"]),
      participant("c", [], ["movie:2"]),
    ]);
    expect(ranked.map((item) => [item.key, item.voteCount, item.rank])).toEqual([["movie:1", 2, 1], ["movie:2", 1, 2]]);
  });
});
