import { describe, expect, it } from "vitest";

import { mapMovieSummary, mapTvSummary } from "./map";
import type { TmdbMovieSummary, TmdbTvSummary } from "./types";

const movie: TmdbMovieSummary = {
  id: 603,
  title: "The Matrix",
  overview: "A hacker learns the truth.",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  genre_ids: [28, 878],
  release_date: "1999-03-31",
  vote_average: 8.2,
};

const tv: TmdbTvSummary = {
  id: 1399,
  name: "Game of Thrones",
  overview: "Noble families vie for control.",
  poster_path: "/got.jpg",
  backdrop_path: null,
  genre_ids: [10765],
  first_air_date: "2011-04-17",
  vote_average: 8.4,
};

describe("mapMovieSummary", () => {
  it("normalizes a TMDB movie into a MediaItem", () => {
    const item = mapMovieSummary(movie, new Map([[28, "Action"]]));
    expect(item).toMatchObject({
      id: "movie:603",
      type: "movie",
      source: "tmdb",
      externalId: "603",
      title: "The Matrix",
      releaseDate: "1999-03-31",
      voteAverage: 8.2,
    });
    expect(item.coverImageUrl).toBe(
      "https://image.tmdb.org/t/p/w500/poster.jpg",
    );
    // Unknown genre ids are dropped; known ones resolved via the lookup.
    expect(item.genres).toEqual(["Action"]);
  });

  it("handles missing poster and empty release date", () => {
    const item = mapMovieSummary({
      ...movie,
      poster_path: null,
      release_date: "",
    });
    expect(item.coverImageUrl).toBeNull();
    expect(item.releaseDate).toBeUndefined();
  });
});

describe("mapTvSummary", () => {
  it("normalizes a TMDB show, using name and first_air_date", () => {
    const item = mapTvSummary(tv);
    expect(item).toMatchObject({
      id: "tv:1399",
      type: "tv",
      title: "Game of Thrones",
      releaseDate: "2011-04-17",
    });
    expect(item.backdropImageUrl).toBeNull();
  });
});
