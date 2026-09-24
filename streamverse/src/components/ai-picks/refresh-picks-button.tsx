"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { getAiPicks } from "@/app/actions/ai-picks";
import { Button } from "@/components/ui/button";
import type { AiPick } from "@/types/ai-picks";

export function RefreshPicksButton({ onRefresh }: { onRefresh: (recommendations: AiPick[], generatedAt: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(false);
  return <Button variant="secondary" disabled={pending || cooldown} onClick={() => startTransition(async () => {
    setCooldown(true);
    const result = await getAiPicks(true);
    if (result.ok) { onRefresh(result.recommendations, result.generatedAt); toast.success("Your AI Picks are refreshed."); }
    else toast.error("We couldn't refresh your picks. Please try again.");
    setCooldown(false);
  })}><RefreshCw className={pending ? "animate-spin" : ""} /> {pending ? "Refreshing…" : "Refresh"}</Button>;
}
