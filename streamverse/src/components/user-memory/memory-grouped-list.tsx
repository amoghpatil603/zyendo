import type { UserMemory } from "@/types/user-memory";
import { MEMORY_TYPES, MEMORY_TYPE_LABELS, MEMORY_TYPE_DESCRIPTIONS } from "@/types/user-memory";
import { groupMemoriesByType } from "@/lib/user-memory/format";
import { MemoryCard } from "./memory-card";

export function MemoryGroupedList({ memories }: { memories: UserMemory[] }) {
  if (memories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No memories yet. Add your first memory above.
      </p>
    );
  }

  const groups = groupMemoriesByType(memories);

  return (
    <div className="space-y-6">
      {MEMORY_TYPES.map((type) => {
        const items = groups[type];
        if (items.length === 0) return null;

        return (
          <section key={type} className="space-y-3">
            <header className="space-y-0.5">
              <h2 className="text-lg font-semibold">{MEMORY_TYPE_LABELS[type]}</h2>
              <p className="text-xs text-muted-foreground">
                {MEMORY_TYPE_DESCRIPTIONS[type]}
              </p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}