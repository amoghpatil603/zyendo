import { describe, expect, it } from "vitest";

import { getAdapter, parseMediaId } from "./registry";

describe("parseMediaId", () => {
  it("splits a well-formed id into type and externalId", () => {
    expect(parseMediaId("movie:603")).toEqual({
      type: "movie",
      externalId: "603",
    });
  });

  it("only splits on the first colon", () => {
    expect(parseMediaId("music:track:99")).toEqual({
      type: "music",
      externalId: "track:99",
    });
  });

  it("returns null when there is no separator", () => {
    expect(parseMediaId("603")).toBeNull();
  });
});

describe("getAdapter", () => {
  it("returns registered adapters for movie and tv", () => {
    expect(getAdapter("movie")?.source).toBe("tmdb");
    expect(getAdapter("tv")?.type).toBe("tv");
  });

  it("returns undefined for unknown verticals", () => {
    expect(getAdapter("books")).toBeUndefined();
  });
});
