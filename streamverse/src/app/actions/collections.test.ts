import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the environment and auth before importing actions
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({ id: "user-123" })),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createCollectionAction,
  addItemToCollectionAction,
} from "./collections";

describe("Collection CRUD and Items Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a collection successfully", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "coll-1",
            user_id: "user-123",
            name: "My Favorites",
            description: null,
            cover_image_url: null,
            is_public: false,
            created_at: "2023-01-01T00:00:00Z",
          },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await createCollectionAction({ name: "My Favorites" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.name).toBe("My Favorites");
      expect(result.data?.userId).toBe("user-123");
    }
  });

  it("ignores duplicate collection items instead of failing", async () => {
    // Simulate Supabase unique constraint violation (code 23505)
    const mockInsert = vi.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    // addItemToCollection first queries for the next sort_order, then inserts.
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
        insert: mockInsert,
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await addItemToCollectionAction({
      collectionId: "coll-1",
      mediaType: "movie",
      mediaId: "123",
    });

    expect(result.ok).toBe(true);
  });
});
