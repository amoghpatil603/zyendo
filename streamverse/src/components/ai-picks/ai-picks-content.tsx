"use client";

import { useState } from "react";

import { AiPicksGrid } from "./ai-picks-grid";
import { RefreshPicksButton } from "./refresh-picks-button";
import type { AiPick } from "@/types/ai-picks";
import type { RecommendationReaction } from "@/types/recommendation-feedback";

export function AiPicksContent({ initialRecommendations, initialGeneratedAt }: { initialRecommendations: AiPick[]; initialGeneratedAt: string }) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  function updateReaction(mediaKey: string, reaction: RecommendationReaction) {
    setRecommendations((current) => current.map((pick) => `${pick.media.type}:${pick.media.externalId}` === mediaKey ? { ...pick, reaction } : pick));
  }
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Freshly tuned for you {new Date(generatedAt).toLocaleDateString()}.</p><RefreshPicksButton onRefresh={(next, timestamp) => { setRecommendations(next); setGeneratedAt(timestamp); }} /></div><AiPicksGrid recommendations={recommendations} onReaction={updateReaction} /></div>;
}
