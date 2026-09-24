import { describe, expect, it } from "vitest";
import { fallbackMediation } from "./watch-together";

describe("Watch Together mediator", () => {
  it("provides a deterministic vote-based fallback without AI", () => {
    expect(fallbackMediation([{ key: "movie:1", mediaType: "movie", mediaId: "1", title: "One", coverImageUrl: null, addedBy: "a", voteCount: 2, rank: 1 }])).toEqual([{ key: "movie:1", reason: "2 votes from the room." }]);
  });
});
