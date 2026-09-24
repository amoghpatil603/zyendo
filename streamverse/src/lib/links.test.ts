import { describe, expect, it } from "vitest";

import { detailHref, mediaHref } from "./links";

describe("detailHref", () => {
  it("routes movies and tv to their sections", () => {
    expect(detailHref("movie", "603")).toBe("/movies/603");
    expect(detailHref("tv", "1399")).toBe("/tv/1399");
  });

  it("falls back to a /<type>/<id> path for other verticals", () => {
    expect(detailHref("anime", "5")).toBe("/anime/5");
  });
});

describe("mediaHref", () => {
  it("builds the href from a media item shape", () => {
    expect(mediaHref({ type: "movie", externalId: "42" })).toBe("/movies/42");
  });
});
