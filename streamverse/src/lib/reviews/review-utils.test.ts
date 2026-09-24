import { describe, expect, it } from "vitest";

import { computeReviewStats } from "./review-utils";

const sampleReviews = [
  { id: "1", rating: 8, body: "Great" },
  { id: "2", rating: 6, body: "Okay" },
  { id: "3", rating: 10, body: "Amazing" },
];

describe("computeReviewStats", () => {
  it("returns null average and 0 count for empty input", () => {
    const stats = computeReviewStats([]);
    expect(stats.averageRating).toBeNull();
    expect(stats.reviewCount).toBe(0);
  });

  it("computes average rating and count", () => {
    const stats = computeReviewStats(sampleReviews);
    expect(stats.reviewCount).toBe(3);
    expect(stats.averageRating).toBeCloseTo((8 + 6 + 10) / 3, 10);
  });

  it("handles single review", () => {
    const stats = computeReviewStats([{ rating: 7 }]);
    expect(stats.reviewCount).toBe(1);
    expect(stats.averageRating).toBe(7);
  });
});