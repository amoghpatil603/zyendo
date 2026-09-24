import type { MemoryType, UserMemory } from "@/types/user-memory";

/**
 * Pure helpers that format user memories for future AI prompts.
 * These do NOT call any AI service — they only prepare text that
 * a future AI integration can consume.
 */

/** Group memories by their type, preserving insertion order. */
export function groupMemoriesByType(
  memories: UserMemory[],
): Record<MemoryType, UserMemory[]> {
  const groups: Record<MemoryType, UserMemory[]> = {
    preference: [],
    exclusion: [],
    constraint: [],
    context: [],
  };

  for (const memory of memories) {
    groups[memory.type].push(memory);
  }

  return groups;
}

/** Format a single memory as a bullet line for a prompt. */
export function formatMemoryLine(memory: UserMemory): string {
  return `- [${memory.type}] ${memory.statement}`;
}

/**
 * Build a compact, prompt-ready block of all active memories.
 * Returns an empty string when there are no memories.
 */
export function formatMemoriesForPrompt(memories: UserMemory[]): string {
  const activeMemories = memories.filter((memory) => memory.active);
  if (activeMemories.length === 0) return "";

  const lines = activeMemories.map(formatMemoryLine);
  return [
    "User memory (apply these when recommending or discussing media):",
    ...lines,
  ].join("\n");
}

/**
 * Build a structured prompt section grouped by type.
 * Useful when the AI should treat exclusions differently from preferences.
 */
export function formatMemoriesGrouped(memories: UserMemory[]): string {
  const activeMemories = memories.filter((memory) => memory.active);
  if (activeMemories.length === 0) return "";

  const groups = groupMemoriesByType(activeMemories);
  const sections: string[] = ["User memory:"];

  (Object.keys(groups) as MemoryType[]).forEach((type) => {
    const items = groups[type];
    if (items.length === 0) return;
    sections.push(`\n${type.toUpperCase()}:`);
    for (const item of items) {
      sections.push(`  - ${item.statement}`);
    }
  });

  return sections.join("\n");
}
