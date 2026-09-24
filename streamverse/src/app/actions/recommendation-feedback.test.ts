import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ isSupabaseConfigured: vi.fn(() => true) }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: vi.fn(() => Promise.resolve({ id: "user-1" })), createSupabaseServerClient: vi.fn() }));
vi.mock("@/app/actions/dna", () => ({ recomputeDna: vi.fn(() => Promise.resolve()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { recomputeDna } from "@/app/actions/dna";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setRecommendationFeedback } from "./recommendation-feedback";

describe("setRecommendationFeedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts a reaction and updates Entertainment DNA", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ upsert }) } as never);

    await expect(setRecommendationFeedback("movie", "603", "ai_picks", "love")).resolves.toEqual({ ok: true, reaction: "love" });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", media_type: "movie", media_id: "603", source: "ai_picks", reaction: "love" }), { onConflict: "user_id,media_type,media_id,source" });
    expect(recomputeDna).toHaveBeenCalledOnce();
  });

  it("rejects an unsupported media type", async () => {
    await expect(setRecommendationFeedback("anime", "1", "ai_picks", "like")).resolves.toEqual({ ok: false, error: "failed" });
  });
});
