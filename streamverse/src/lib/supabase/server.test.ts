import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAll = vi.fn();
const mockSet = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: mockGetAll,
    set: mockSet,
  })),
}));

vi.mock("@/lib/env", () => ({
  publicEnv: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  },
  isSupabaseConfigured: () => true,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
    },
  })),
}));

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockReturnValue([]);
  });

  it("returns null without calling getUser when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { getCurrentUser } = await import("./server");
    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});
