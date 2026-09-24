import { describe, expect, it } from "vitest";

import { formatPersonalizationContext } from "./personal-context";

describe("formatPersonalizationContext", () => {
  it("includes Entertainment DNA and active user-memory signals", () => {
    const context = formatPersonalizationContext(
      { genre_weights: [{ name: "Drama", weight: 1 }], mood_tags: ["thoughtful"] },
      [{ type: "exclusion", statement: "No horror" }],
    );

    expect(context).toContain("Drama");
    expect(context).toContain("No horror");
    expect(context).toContain("private");
  });

  it("uses empty defaults when a user has no saved signals", () => {
    expect(formatPersonalizationContext(null, [])).toContain("DNA={}; memories=[]");
  });
});
