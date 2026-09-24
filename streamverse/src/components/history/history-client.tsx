"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { History as HistoryIcon, Trash2, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { WatchHistoryGroup } from "@/types/profile";
import { MediaCard } from "@/components/media/media-card";

interface HistoryClientProps {
  userId: string;
}

export function HistoryClient({ userId }: HistoryClientProps) {
  const [history, setHistory] = useState<WatchHistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/app/actions/profile");
      const result = await mod.getGroupedWatchHistoryAction();
      
      if (result.ok) {
        setHistory(result.data);
      } else {
        toast.error("Failed to load history");
      }
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (entryId: string) => {
    try {
      const mod = await import("@/app/actions/profile");
      const result = await mod.removeWatchHistoryEntryAction({ id: entryId });
      if (result.ok) {
        toast.success("Removed from history");
        loadHistory();
      } else {
        toast.error("Failed to remove item");
      }
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your entire watch history? This cannot be undone.")) return;
    
    try {
      const mod = await import("@/app/actions/profile");
      const result = await mod.clearWatchHistoryAction();
      if (result.ok) {
        toast.success("Watch history cleared");
        loadHistory();
      } else {
        toast.error("Failed to clear history");
      }
    } catch {
      toast.error("Failed to clear history");
    }
  };

  // Filter
  const filteredGroups = history.map(group => ({
    ...group,
    entries: group.entries.filter(entry => 
      !searchQuery || entry.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.entries.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-2">
            <HistoryIcon className="size-6 text-primary" />
            Watch History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Keep track of everything you've watched
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleClearHistory} className="w-full sm:w-auto">
            Clear History
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* History List */}
      {loading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="aspect-[2/3] w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="space-y-8">
          {filteredGroups.map((group) => (
            <div key={group.date} className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground border-b border-border/40 pb-2">
                <Calendar className="size-4" />
                {group.label}
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="relative group/history">
                    <MediaCard 
                      item={{
                        id: entry.mediaId,
                        type: entry.mediaType as any,
                        title: entry.title,
                        coverImageUrl: entry.coverImageUrl ?? null,
                        voteAverage: entry.rating ?? undefined,
                        synopsis: "",
                        source: "tmdb",
                        externalId: entry.mediaId,
                        genres: [],
                        people: [],
                      }} 
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 size-8 rounded-full opacity-0 group-hover/history:opacity-100 transition shadow-md z-20"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(entry.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HistoryIcon className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mb-2 text-lg font-semibold">No history found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search query"
              : "Looks like you haven't watched anything yet."}
          </p>
        </div>
      )}
    </div>
  );
}
