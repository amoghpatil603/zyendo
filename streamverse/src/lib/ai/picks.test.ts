import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ isAIConfigured: vi.fn(() => true), isTmdbConfigured: vi.fn(() => true), isSupabaseConfigured: vi.fn(() => false), serverEnv: { groqApiKey: "grok-key", groqModel: "llama-3.3-70b-versatile" } }));
vi.mock("@/lib/adapters/tmdb", () => ({ getTrendingAll: vi.fn() }));
vi.mock("@/lib/adapters/registry", () => ({ getMediaDetail: vi.fn() }));

import { getTrendingAll } from "@/lib/adapters/tmdb";
import { getMediaDetail } from "@/lib/adapters/registry";
import { generateAiPicks, isAiPicksCacheFresh } from "./picks";

const picks = Array.from({ length: 6 }, (_, index) => ({ type: index % 2 === 0 ? "movie" : "tv", id: String(index + 1), why: `Because it matches preference ${index + 1}` }));

describe("AI Picks generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTrendingAll).mockResolvedValue(Array.from({ length: 8 }, (_, index) => ({ type: index % 2 === 0 ? "movie" : "tv", externalId: String(index + 1), title: `Title ${index + 1}`, genres: ["Drama"], releaseDate: "2025-01-01", voteAverage: 8 })) as never);
    vi.mocked(getMediaDetail).mockImplementation(async (type, id) => ({ id: `${type}:${id}`, type, externalId: id, title: `Title ${id}` }) as never);
  });

  it("recognizes valid unexpired cache records", () => {
    expect(isAiPicksCacheFresh("2030-01-01T00:00:00.000Z", Date.parse("2029-01-01T00:00:00.000Z"))).toBe(true);
    expect(isAiPicksCacheFresh("2029-01-01T00:00:00.000Z", Date.parse("2030-01-01T00:00:00.000Z"))).toBe(false);
    expect(isAiPicksCacheFresh("invalid")).toBe(false);
  });

  it("uses local AI's prompt injection flow and returns hydrated recommendations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ recommendations: picks }) } }] })));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateAiPicks("memories=[No horror]");

    expect(result).toHaveLength(6);
    expect(getTrendingAll).toHaveBeenCalledOnce();
    expect(getMediaDetail).toHaveBeenCalledTimes(6);
  });

  it("rejects recommendations that are not returned by TMDB", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ recommendations: picks.map((pick) => ({ ...pick, id: "999" })) }) } }] })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateAiPicks("context")).rejects.toThrow("too few valid");
  });
});
