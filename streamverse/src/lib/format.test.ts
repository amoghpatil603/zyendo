import { describe, expect, it } from "vitest";

import {
  formatRating,
  formatRuntime,
  formatYear,
  mediaTypeLabel,
} from "./format";

describe("formatRuntime", () => {
  it("returns null for missing or non-positive input", () => {
    expect(formatRuntime()).toBeNull();
    expect(formatRuntime(0)).toBeNull();
  });

  it("formats minutes, hours, and combined", () => {
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(120)).toBe("2h");
    expect(formatRuntime(142)).toBe("2h 22m");
  });
});

describe("formatYear", () => {
  it("extracts a 4-digit year", () => {
    expect(formatYear("2023-05-01")).toBe("2023");
  });

  it("returns null for empty or malformed dates", () => {
    expect(formatYear()).toBeNull();
    expect(formatYear("not-a-date")).toBeNull();
  });
});

describe("formatRating", () => {
  it("rounds to one decimal", () => {
    expect(formatRating(8.234)).toBe("8.2");
  });

  it("returns null when there is no rating", () => {
    expect(formatRating()).toBeNull();
    expect(formatRating(0)).toBeNull();
  });
});

describe("mediaTypeLabel", () => {
  it("maps known types and falls back to the raw value", () => {
    expect(mediaTypeLabel("movie")).toBe("Movie");
    expect(mediaTypeLabel("tv")).toBe("TV");
    expect(mediaTypeLabel("podcast")).toBe("podcast");
  });
});
