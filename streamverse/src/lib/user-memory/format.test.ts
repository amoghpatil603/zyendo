import { describe, expect, it } from "vitest";

import {
  groupMemoriesByType,
  formatMemoryLine,
  formatMemoriesForPrompt,
  formatMemoriesGrouped,
} from "@/lib/user-memory/format";
import type { UserMemory } from "@/types/user-memory";

function makeMemory(overrides: Partial<UserMemory> = {}): UserMemory {
  return {
    id: "1",
    userId: "user-1",
    statement: "I love Christopher Nolan",
    type: "preference",
    active: true,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("user memory format helpers", () => {
  it("groups memories by type", () => {
    const memories = [
      makeMemory({ id: "1", type: "preference", statement: "Nolan" }),
      makeMemory({ id: "2", type: "exclusion", statement: "Horror" }),
      makeMemory({ id: "3", type: "preference", statement: "Sci-fi" }),
    ];

    const groups = groupMemoriesByType(memories);
    expect(groups.preference).toHaveLength(2);
    expect(groups.exclusion).toHaveLength(1);
    expect(groups.constraint).toHaveLength(0);
    expect(groups.context).toHaveLength(0);
  });

  it("formats a single memory line", () => {
    const memory = makeMemory({ type: "exclusion", statement: "No horror" });
    expect(formatMemoryLine(memory)).toBe("- [exclusion] No horror");
  });

  it("returns empty string for empty prompt", () => {
    expect(formatMemoriesForPrompt([])).toBe("");
    expect(formatMemoriesGrouped([])).toBe("");
  });

  it("formats memories for a flat prompt", () => {
    const memories = [
      makeMemory({ type: "preference", statement: "Nolan" }),
      makeMemory({ type: "exclusion", statement: "Horror" }),
    ];
    const prompt = formatMemoriesForPrompt(memories);
    expect(prompt).toContain("User memory");
    expect(prompt).toContain("- [preference] Nolan");
    expect(prompt).toContain("- [exclusion] Horror");
  });

  it("formats memories grouped by type", () => {
    const memories = [
      makeMemory({ type: "preference", statement: "Nolan" }),
      makeMemory({ type: "exclusion", statement: "Horror" }),
    ];
    const prompt = formatMemoriesGrouped(memories);
    expect(prompt).toContain("PREFERENCE:");
    expect(prompt).toContain("EXCLUSION:");
    expect(prompt).toContain("Nolan");
    expect(prompt).toContain("Horror");
  });
});