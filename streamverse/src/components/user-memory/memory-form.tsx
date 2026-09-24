"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserMemory, updateUserMemory } from "@/app/actions/user-memory";
import {
  MEMORY_TYPES,
  MEMORY_TYPE_LABELS,
  type MemoryType,
  type UserMemory,
} from "@/types/user-memory";

export function MemoryForm({
  memory,
  onSuccess,
}: {
  memory?: UserMemory | null;
  onSuccess?: () => void;
}) {
  const [statement, setStatement] = useState(memory?.statement ?? "");
  const [type, setType] = useState<MemoryType>(memory?.type ?? "preference");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!statement.trim()) {
      toast.error("Please enter a memory statement.");
      return;
    }

    startTransition(async () => {
      const result = memory
        ? await updateUserMemory(memory.id, { statement: statement.trim(), type })
        : await createUserMemory(statement.trim(), type);

      if (result.ok) {
        toast.success(memory ? "Memory updated." : "Memory added.");
        onSuccess?.();
      } else {
        toast.error("Couldn't save memory. Try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass space-y-3 rounded-xl p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Statement</label>
        <Input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="e.g. I don't like horror"
          maxLength={500}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {MEMORY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {MEMORY_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {memory ? "Update" : "Add"} Memory
        </Button>
      </div>
    </form>
  );
}
