import { describe, expect, it } from "vitest";

import { applyRecommendationFeedbackToDna } from "./feedback";

describe("applyRecommendationFeedbackToDna", () => {
  it("weights love and like while excluding disliked titles", () => {
    const items = applyRecommendationFeedbackToDna(
      [{ mediaType: "movie", mediaId: "1" }, { mediaType: "tv", mediaId: "2" }],
      [
        { media_type: "movie", media_id: "1", reaction: "love" },
        { media_type: "tv", media_id: "2", reaction: "dislike" },
        { media_type: "movie", media_id: "3", reaction: "like" },
      ],
    );

    expect(items.filter((item) => item.mediaId === "1")).toHaveLength(3);
    expect(items.some((item) => item.mediaId === "2")).toBe(false);
    expect(items.filter((item) => item.mediaId === "3")).toHaveLength(2);
  });
});
