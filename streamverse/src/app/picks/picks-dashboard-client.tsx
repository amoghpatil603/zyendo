"use client";

import { useState } from "react";
import {
  Sparkles, Flame, Eye, Clock, ListMusic, Film, Tv, Compass,
  Zap, RefreshCw, Smile, Dna, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

import { MediaCard } from "@/components/media/media-card";
import { AiPicksGrid } from "@/components/ai-picks/ai-picks-grid";
import { RefreshPicksButton } from "@/components/ai-picks/refresh-picks-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { getAiPicks } from "@/app/actions/ai-picks";
import type { MediaItem } from "@/types/media-item";
import type { AiPick } from "@/types/ai-picks";
import type { RecommendationReaction } from "@/types/recommendation-feedback";

interface CollectionSummary {
  id: string;
  name: string;
  itemCount: number;
}

interface AiPicksDashboardClientProps {
  picks: AiPick[];
  generatedAt: string | null;
  trending: MediaItem[];
  upcomingMovies: MediaItem[];
  watchHistoryItems: MediaItem[];
  watchQueueItems: MediaItem[];
  continueWatchingItems: MediaItem[];
  collections: CollectionSummary[];
  hasDna: boolean;
}

const MOOD_TAGS = [
  { label: "Action", emoji: "💥", query: "Action" },
  { label: "Comedy", emoji: "😂", query: "Comedy" },
  { label: "Horror", emoji: "👻", query: "Horror" },
  { label: "Romance", emoji: "❤️", query: "Romance" },
  { label: "Sci-Fi", emoji: "🚀", query: "Science Fiction" },
  { label: "Thriller", emoji: "🔪", query: "Thriller" },
  { label: "Drama", emoji: "🎭", query: "Drama" },
  { label: "Anime", emoji: "🗾", query: "Anime" },
];

export function AiPicksDashboardClient({
  picks: initialPicks,
  generatedAt,
  trending,
  upcomingMovies,
  watchHistoryItems,
  watchQueueItems,
  continueWatchingItems,
  collections,
  hasDna,
}: AiPicksDashboardClientProps) {
  const [picks, setPicks] = useState(initialPicks);
  const [picksGeneratedAt, setPicksGeneratedAt] = useState(generatedAt);

  function updateReaction(mediaKey: string, reaction: RecommendationReaction) {
    setPicks((current) =>
      current.map((pick) =>
        `${pick.media.type}:${pick.media.externalId}` === mediaKey
          ? { ...pick, reaction }
          : pick,
      ),
    );
  }

  const hasPicks = picks.length > 0;

  // --- Section: Mood Cards (genre-based discovery links) ---
  function MoodCardsSection() {
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Smile className="size-5 text-primary" />
          Mood Cards — What are you in the mood for?
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {MOOD_TAGS.map((mood) => (
            <a
              key={mood.label}
              href={`/search?genres=${encodeURIComponent(mood.query)}`}
              className="group flex flex-col items-center gap-1 rounded-2xl border border-border/60 glass p-4 text-center transition hover:border-primary/40 hover:-translate-y-1"
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs font-medium">{mood.label}</span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  // --- Section: Continue Watching ---
  function ContinueWatchingSection() {
    if (continueWatchingItems.length === 0) return null;
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Eye className="size-5 text-primary" />
          Continue Watching
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {continueWatchingItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  // --- Section: Trending For You ---
  function TrendingSection() {
    if (trending.length === 0) return null;
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Flame className="size-5 text-primary" />
          Trending For You
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {trending.slice(0, 10).map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  // --- Section: Hidden Gems / Upcoming ---
  function UpcomingSection() {
    if (upcomingMovies.length === 0) return null;
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Zap className="size-5 text-primary" />
          Hidden Gems & Upcoming
        </h2>
        <p className="text-sm text-muted-foreground -mt-1">
          Fresh releases and soon-to-be hits you might have missed.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {upcomingMovies.slice(0, 8).map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  // --- Section: Based on Your Watch History ---
  function WatchHistorySection() {
    if (watchHistoryItems.length === 0) return null;
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Clock className="size-5 text-primary" />
          Because You Watched...
        </h2>
        <p className="text-sm text-muted-foreground -mt-1">
          Recommendations based on your recently watched titles.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {watchHistoryItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  // --- Section: Based on Your Watch Queue ---
  function WatchQueueSection() {
    if (watchQueueItems.length === 0) return null;
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ListMusic className="size-5 text-primary" />
          Based on Your Watch Queue
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {watchQueueItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  // --- Section: Based on Collections ---
  function CollectionsSection() {
    if (collections.length === 0) return null;
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="size-5 text-primary" />
          From Your Collections
        </h2>
        <p className="text-sm text-muted-foreground -mt-1">
          {collections.length} collection{collections.length !== 1 ? "s" : ""} — dive back into your curated lists.
        </p>
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => (
            <a
              key={c.id}
              href={`/collections/${c.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-2 text-sm font-medium transition hover:border-primary/40"
            >
              <FolderOpen className="size-4 text-primary" />
              {c.name}
              <span className="text-xs text-muted-foreground">({c.itemCount})</span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  // --- Section: Entertainment DNA Insight ---
  function DnaSection() {
    if (!hasDna) return null;
    return (
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Dna className="size-5 text-primary" />
          Entertainment DNA Insights
        </h2>
        <p className="text-sm text-muted-foreground -mt-1">
          Your taste profile powers these recommendations.
        </p>
        <div>
          <a
            href="/dna"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-2 text-sm font-medium transition hover:border-primary/40"
          >
            <Dna className="size-4 text-primary" />
            View your DNA
          </a>
        </div>
      </section>
    );
  }

  // --- Section: Assistant link (quick access) ---
  function AssistantLink() {
    return (
      <section className="rounded-2xl border border-border/60 glass p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Want a more conversational approach?
        </p>
        <Button asChild>
          <a href="/assistant">
            <Sparkles className="size-4" />
            Ask the AI Assistant
          </a>
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {/* Today's AI Picks */}
      {hasPicks ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="size-5 text-primary" />
              Today's AI Picks
            </h2>
            <RefreshPicksButton
              onRefresh={(next, timestamp) => {
                setPicks(next);
                setPicksGeneratedAt(timestamp);
              }}
            />
          </div>
          {picksGeneratedAt && (
            <p className="text-sm text-muted-foreground -mt-1">
              Freshly tuned for you — {new Date(picksGeneratedAt).toLocaleDateString()}
            </p>
          )}
          <AiPicksGrid recommendations={picks} onReaction={updateReaction} />
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="size-5 text-primary" />
              Today's AI Picks
            </h2>
            <Button
              variant="secondary"
              onClick={async () => {
                const result = await getAiPicks(true);
                if (result.ok) {
                  setPicks(result.recommendations);
                  setPicksGeneratedAt(result.generatedAt);
                  toast.success("Your AI Picks are ready!");
                } else {
                  toast.error("Could not generate picks right now.");
                }
              }}
            >
              <RefreshCw className="size-4" />
              Generate Picks
            </Button>
          </div>
          <EmptyState icon={Sparkles} title="No picks yet" description="Click generate to get your personalized recommendations." />
        </section>
      )}

      {/* Continue Watching */}
      <ContinueWatchingSection />

      {/* Mood Cards */}
      <MoodCardsSection />

      {/* Trending */}
      <TrendingSection />

      {/* Upcoming / Hidden Gems */}
      <UpcomingSection />

      {/* Watch History */}
      <WatchHistorySection />

      {/* Watch Queue */}
      <WatchQueueSection />

      {/* Collections */}
      <CollectionsSection />

      {/* DNA Insights */}
      <DnaSection />

      {/* Assistant Link */}
      <AssistantLink />
    </div>
  );
}
