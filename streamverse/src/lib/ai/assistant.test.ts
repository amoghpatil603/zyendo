import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamAssistantReply } from "./assistant";
import { getAIProvider } from "./provider";

vi.mock("./provider", () => ({
  getAIProvider: vi.fn(() => ({
    streamChat: vi.fn().mockResolvedValue(new ReadableStream()),
  })),
}));

vi.mock("@/lib/adapters/tmdb", () => ({
  getTrendingAll: vi.fn().mockResolvedValue([]),
  searchMulti: vi.fn().mockResolvedValue({ all: [] }),
}));

describe("streamAssistantReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should stream chatbot responses using the provider", async () => {
    const stream = await streamAssistantReply(
      [{ id: "1", role: "user", content: "hallo" }],
      "DNA={}; memories=[]"
    );
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(getAIProvider).toHaveBeenCalledOnce();
  });
});
