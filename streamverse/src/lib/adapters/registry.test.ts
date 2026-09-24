import { describe, expect, it } from "vitest";

import { getAdapter, parseMediaId, normalizeExternalId } from "./registry";

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

describe("normalizeExternalId", () => {
  it("returns normalized numeric ID for numeric strings", () => {
    expect(normalizeExternalId("296206")).toBe("296206");
  });

  it("removes tv: prefix", () => {
    expect(normalizeExternalId("tv:296206")).toBe("296206");
  });

  it("removes movie: prefix", () => {
    expect(normalizeExternalId("movie:550")).toBe("550");
  });

  it("URL-decodes the ID before normalizing", () => {
    expect(normalizeExternalId("movie%3A550")).toBe("550");
    expect(normalizeExternalId("tv%3A296206")).toBe("296206");
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
