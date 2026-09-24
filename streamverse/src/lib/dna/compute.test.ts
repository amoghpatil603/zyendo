import { describe, expect, it } from "vitest";

import { computeDna } from "./compute";
import type { MediaItem } from "@/types/media-item";

const baseMovie = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: "movie:603",
  type: "movie",
  title: "The Matrix",
  coverImageUrl: null,
  synopsis: "A hacker learns the truth.",
  source: "tmdb",
  externalId: "603",
  genres: ["Action", "Science Fiction"],
  people: [
    {
      name: "Keanu Reeves",
      role: "as Neo",
      imageUrl: "/keanu.jpg",
      externalId: "6384",
    },
    {
      name: "Lana Wachowski",
      role: "Director",
      externalId: "101",
    },
  ],
  runtimeMinutes: 136,
  releaseDate: "1999-03-31",
  voteAverage: 8.2,
  ...overrides,
});

const baseTv = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: "tv:1399",
  type: "tv",
  title: "Game of Thrones",
  coverImageUrl: null,
  synopsis: "Noble families vie for control.",
  source: "tmdb",
  externalId: "1399",
  genres: ["Drama", "Fantasy", "Adventure"],
  people: [
    {
      name: "Emilia Clarke",
      role: "as Daenerys Targaryen",
      imageUrl: "/emilia.jpg",
      externalId: "1223786",
    },
    {
      name: "David Benioff",
      role: "Director",
      externalId: "202",
    },
  ],
  runtimeMinutes: 60,
  releaseDate: "2011-04-17",
  voteAverage: 8.4,
  ...overrides,
});

describe("computeDna", () => {
  it("returns empty arrays for an empty watchlist", () => {
    const result = computeDna({ items: [] });
    expect(result.genreWeights).toEqual([]);
    expect(result.topActors).toEqual([]);
    expect(result.topDirectors).toEqual([]);
    expect(result.preferredLanguages).toEqual([]);
    expect(result.preferredRuntimeRange).toBeNull();
    expect(result.moodTags).toEqual([]);
  });

  it("computes genre weights from a single item", () => {
    const result = computeDna({ items: [baseMovie()] });
    expect(result.genreWeights).toHaveLength(2);
    const action = result.genreWeights.find((g) => g.name === "Action")!;
    expect(action.weight).toBe(1);
    expect(action.count).toBe(1);
  });

  it("normalizes genre weights across multiple items", () => {
    const items = [
      baseMovie({ genres: ["Action", "Science Fiction"] }),
      baseMovie({ genres: ["Action"] }),
      baseMovie({ genres: ["Drama", "Action"] }),
    ];
    const result = computeDna({ items });

    // Action appears in 3/3 — should have weight 1
    const action = result.genreWeights.find((g) => g.name === "Action")!;
    expect(action.count).toBe(3);
    expect(action.weight).toBe(1);

    // Science Fiction appears in 1/3 — should have weight < 1
    const scifi = result.genreWeights.find((g) => g.name === "Science Fiction")!;
    expect(scifi.count).toBe(1);
    expect(scifi.weight).toBeLessThan(1);
  });

  it("extracts top actors correctly", () => {
    const items = [
      baseMovie({ people: baseMovie().people }),
      baseMovie({
        people: [
          {
            name: "Keanu Reeves",
            role: "as Neo",
            externalId: "6384",
          },
          {
            name: "Laurence Fishburne",
            role: "as Morpheus",
            externalId: "2975",
          },
        ],
      }),
    ];
    const result = computeDna({ items });

    expect(result.topActors).toHaveLength(2);
    const keanu = result.topActors.find((a) => a.externalId === "6384")!;
    expect(keanu.count).toBe(2); // appears in both
    expect(keanu.role).toBe("actor");

    const fishburne = result.topActors.find((a) => a.externalId === "2975")!;
    expect(fishburne.count).toBe(1);
  });

  it("extracts top directors correctly", () => {
    const items = [
      baseMovie({
        people: [
          ...baseMovie().people.filter((p) => p.role === "as Neo"),
          { name: "Lana Wachowski", role: "Director", externalId: "101" },
        ],
      }),
    ];
    const result = computeDna({ items });

    expect(result.topDirectors).toHaveLength(1);
    expect(result.topDirectors[0].name).toBe("Lana Wachowski");
    expect(result.topDirectors[0].count).toBe(1);
  });

  it("computes runtime range from multiple items", () => {
    const items = [
      baseMovie({ runtimeMinutes: 90 }),
      baseMovie({ runtimeMinutes: 120 }),
      baseMovie({ runtimeMinutes: 150 }),
      baseMovie({ runtimeMinutes: 180 }),
    ];
    const result = computeDna({ items });
    expect(result.preferredRuntimeRange).not.toBeNull();
    // 25th and 75th percentile of [90, 120, 150, 180]
    const [min, max] = result.preferredRuntimeRange!;
    expect(min).toBeLessThanOrEqual(max);
  });

  it("returns null runtime range when no items have runtime", () => {
    const items = [baseMovie({ runtimeMinutes: undefined })];
    const result = computeDna({ items });
    expect(result.preferredRuntimeRange).toBeNull();
  });

  it("derives mood tags from genres", () => {
    const items = [
      baseMovie({ genres: ["Comedy"] }),
      baseMovie({ genres: ["Comedy", "Romance"] }),
    ];
    const result = computeDna({ items });

    expect(result.moodTags.length).toBeGreaterThan(0);
    const funny = result.moodTags.find((m) => m.tag === "funny")!;
    expect(funny.weight).toBe(1); // comedy maps to "funny"
  });

  it("flags quick watch for short runtimes", () => {
    const items = [baseMovie({ genres: ["Comedy"], runtimeMinutes: 80 })];
    const result = computeDna({ items });

    const quick = result.moodTags.find((m) => m.tag === "quick watch")!;
    expect(quick).toBeDefined();
  });

  it("skips crew members that are not actors or directors", () => {
    const items = [
      baseMovie({
        people: [
          {
            name: "John Doe",
            role: "Producer",
            externalId: "999",
          },
        ],
      }),
    ];
    const result = computeDna({ items });
    expect(result.topActors).toHaveLength(0);
    expect(result.topDirectors).toHaveLength(0);
  });

  it("sorts genres by weight descending", () => {
    const items = [
      baseMovie({ genres: ["Drama"] }),
      baseMovie({ genres: ["Comedy"] }),
      baseMovie({ genres: ["Comedy"] }),
      baseMovie({ genres: ["Comedy"] }),
    ];
    const result = computeDna({ items });
    expect(result.genreWeights[0].name).toBe("Comedy");
    expect(result.genreWeights[0].count).toBe(3);
    expect(result.genreWeights[1].name).toBe("Drama");
    expect(result.genreWeights[1].count).toBe(1);
  });

  it("limits mood tags to 10", () => {
    // Create items across many genre combos to generate lots of mood tags
    const genres = ["Comedy", "Horror", "Thriller", "Romance", "Drama", "Action", "Adventure", "Science Fiction", "Fantasy", "Documentary", "Animation", "Mystery"];
    const items = genres.map((g) => baseMovie({ genres: [g] }));
    const result = computeDna({ items });
    expect(result.moodTags.length).toBeLessThanOrEqual(10);
  });

  it("handles mixed movie and TV items", () => {
    const items = [baseMovie(), baseTv()];
    const result = computeDna({ items });

    expect(result.genreWeights.length).toBeGreaterThan(0);
    expect(result.topActors.length).toBeGreaterThanOrEqual(2);
    expect(result.topDirectors.length).toBeGreaterThanOrEqual(2);
  });
});