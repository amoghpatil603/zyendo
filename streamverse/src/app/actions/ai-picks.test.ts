import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ isSupabaseConfigured: vi.fn(() => true), isAIConfigured: vi.fn(() => true), isTmdbConfigured: vi.fn(() => true) }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: vi.fn(() => Promise.resolve({ id: "user-1" })), createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/ai/personal-context", () => ({ getPersonalizationContext: vi.fn(() => Promise.resolve("context")) }));
vi.mock("@/lib/ai/picks", () => ({ generateAiPicks: vi.fn(), isAiPicksCacheFresh: vi.fn((value: string) => value === "fresh") }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { generateAiPicks } from "@/lib/ai/picks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiPicks } from "./ai-picks";

const recommendations = Array.from({ length: 6 }, (_, index) => ({ media: { id: `movie:${index}`, type: "movie", externalId: String(index), title: `Title ${index}` }, why: "A fit for your profile" }));

describe("getAiPicks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a fresh per-user cache without calling AI provider", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { recommendations, generated_at: "2026-01-01", expires_at: "fresh" }, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) }) } as never);

    await expect(getAiPicks()).resolves.toMatchObject({ ok: true, cached: true, recommendations });
    expect(generateAiPicks).not.toHaveBeenCalled();
  });

  it("generates and writes a cache record when refreshing", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ upsert }) } as never);
    vi.mocked(generateAiPicks).mockResolvedValue(recommendations as never);

    await expect(getAiPicks(true)).resolves.toMatchObject({ ok: true, cached: false, recommendations });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", recommendations }), { onConflict: "user_id" });
  });

  it("rejects malformed refresh input", async () => {
    await expect(getAiPicks("yes" as never)).resolves.toEqual({ ok: false, error: "failed" });
  });
});
