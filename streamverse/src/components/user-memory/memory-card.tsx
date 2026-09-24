"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteUserMemory, updateUserMemory } from "@/app/actions/user-memory";
import { MEMORY_TYPE_LABELS, type UserMemory } from "@/types/user-memory";
import { MemoryForm } from "./memory-form";

export function MemoryCard({ memory }: { memory: UserMemory }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserMemory(memory.id);
      if (result.ok) {
        toast.success("Memory deleted.");
      } else {
        toast.error("Couldn't delete memory. Try again.");
      }
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await updateUserMemory(memory.id, { active: !memory.active });
      if (result.ok) {
        toast.success(memory.active ? "Memory deactivated." : "Memory activated.");
      } else {
        toast.error("Couldn't update memory. Try again.");
      }
    });
  }

  if (editing) {
    return (
      <MemoryForm
        memory={memory}
        onSuccess={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="glass flex items-start justify-between gap-3 rounded-xl p-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{MEMORY_TYPE_LABELS[memory.type]}</p>
        <p className={memory.active ? "" : "line-through opacity-60"}>{memory.statement}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggleActive}
          disabled={isPending}
          title={memory.active ? "Deactivate" : "Activate"}
        >
          <span className="text-xs">{memory.active ? "Hide" : "Show"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          disabled={isPending}
          aria-label="Edit memory"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Delete memory"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}