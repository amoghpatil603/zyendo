"use client";

import { useState, useRef } from "react";
import { Search, Lightbulb, Sparkles, Loader2, ArrowRight, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaGrid } from "@/components/media/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaItem } from "@/types/media-item";

interface SemanticSearchResponse {
  semantic: boolean;
  query: string;
  items: MediaItem[];
}

const SUGGESTIONS = [
  "I want something emotional",
  "Mind-bending sci-fi",
  "Slow burn thriller",
  "Feel-good comedy",
  "Award-winning drama",
  "Underrated hidden gem",
  "Family-friendly adventure",
  "Classic romance",
];

export function SmartSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [semantic, setSemantic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSearch(searchQuery: string) {
    const q = searchQuery || query;
    if (!q.trim()) return;

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSearched(true);
    setSemantic(false);
    setError(null);

    try {
      // Genuine semantic search: AI extracts intent, then TMDB discovery.
      const res = await fetch(`/api/discover/search?q=${encodeURIComponent(q.trim())}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Search failed");
      const data: SemanticSearchResponse = await res.json();
      setResults(data.items ?? []);
      setSemantic(Boolean(data.semantic));
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Search failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Lightbulb className="size-5 text-primary" />
        Smart Search
      </h2>

      <div className="glass rounded-2xl border border-border/60 p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Describe what you're in the mood for — we'll find the perfect match.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              placeholder='e.g. "I want something emotional"'
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={() => handleSearch(query)} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                handleSearch(s);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:text-primary"
            >
              <ArrowRight className="size-2.5" />
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-center text-sm text-destructive py-4">{error}</p>
      )}

      {!loading && searched && !error && results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Found {results.length} results</p>
            {semantic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Brain className="size-3" />
                AI understood your intent
              </span>
            )}
          </div>
          <MediaGrid items={results} />
        </div>
      )}

      {!loading && searched && !error && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">No results for &ldquo;{query}&rdquo;</p>
      )}
    </section>
  );
}
