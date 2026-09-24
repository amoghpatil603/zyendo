import { describe, expect, it, vi, beforeEach } from "vitest";

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
  createUserMemory,
  deleteUserMemory,
  listUserMemories,
} from "./user-memory";

describe("User Memory actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user memory successfully", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "mem-1",
            user_id: "user-123",
            statement: "I love Christopher Nolan",
            type: "preference",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
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

    const result = await createUserMemory("I love Christopher Nolan", "preference");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.memory.statement).toBe("I love Christopher Nolan");
      expect(result.memory.type).toBe("preference");
      expect(result.memory.userId).toBe("user-123");
    }
  });

  it("rejects an invalid memory type", async () => {
    const result = await createUserMemory("test", "not-a-type" as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("invalid_type");
    }
  });

  it("lists user memories in newest-first order", async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "mem-1",
              user_id: "user-123",
              statement: "No horror",
              type: "exclusion",
              active: true,
              created_at: "2024-01-01T00:00:00Z",
            },
          ],
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await listUserMemories();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].type).toBe("exclusion");
    }
  });

  it("deletes a user memory", async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ delete: mockDelete }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await deleteUserMemory("00000000-0000-4000-8000-000000000001");
    expect(result.ok).toBe(true);
  });
});
