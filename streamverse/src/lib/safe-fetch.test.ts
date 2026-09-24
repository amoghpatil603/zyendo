import { beforeEach, describe, expect, it, vi } from "vitest";

describe("safeFetch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a fallback response for transient fetch failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const { safeFetch } = await import("./safe-fetch");
    const response = await safeFetch("https://example.com/test", { maxAttempts: 1 });

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("Upstream request failed");
  }, 10000);
});
