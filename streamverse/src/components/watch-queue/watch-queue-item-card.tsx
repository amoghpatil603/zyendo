"use client";

import * as React from "react";
import { Clock3, Heart, Play, Star, Trash2 } from "lucide-react";

import type { WatchQueueItem, WatchQueuePriority, WatchQueueStatus } from "@/lib/watch-queue-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateWatchQueueNotesAction, updateWatchQueuePriorityAction, updateWatchQueueRatingAction, updateWatchQueueStatusAction, toggleFavoriteAction, removeFromWatchQueueAction } from "@/app/actions/watch-queue";


function statusBadgeVariant(status: WatchQueueStatus) {
  switch (status) {
    case "pending":
      return "secondary" as const;
    case "watching":
      return "default" as const;
    case "watched":
      return "outline" as const;
  }
}

function getYear(releaseDate: string | null) {
  if (!releaseDate) return null;
  const d = new Date(releaseDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

export default function WatchQueueItemCard(props: {
  item: WatchQueueItem;
  optimistic?: Partial<WatchQueueItem>;
}) {
  const { item, optimistic } = props;
  const merged: WatchQueueItem = {
    ...item,
    ...(optimistic ?? {}),
  };

  const [notesDraft, setNotesDraft] = React.useState<string>(merged.notes ?? "");
  React.useEffect(() => {
    setNotesDraft(merged.notes ?? "");
  }, [merged.id]);

  const updateStatus = async (next: WatchQueueStatus) => {
    await updateWatchQueueStatusAction({ id: merged.id, status: next });
  };

  const updatePriority = async (next: WatchQueuePriority) => {
    await updateWatchQueuePriorityAction({ id: merged.id, priority: next });
  };

  const updateRating = async (next: number | null) => {
    await updateWatchQueueRatingAction({ id: merged.id, rating: next });
  };

  const updateNotes = async () => {
    await updateWatchQueueNotesAction({ id: merged.id, notes: notesDraft.trim() ? notesDraft : null });
  };

  const toggleFav = async () => {
    await toggleFavoriteAction({ id: merged.id });
  };

  const remove = async () => {
    await removeFromWatchQueueAction({ id: merged.id });
  };

  const year = getYear(merged.releaseDate);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-4">
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
          {merged.posterPath ? (
            // poster is optional; keep it simple to avoid importing tmdb image helper
            <img
              className="h-full w-full object-cover"
              src={merged.posterPath}
              alt={merged.title}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{merged.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {merged.mediaType === "movie" ? "Movie" : "TV"}
                </span>
                {year ? <span>{year}</span> : null}
              </div>
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={toggleFav} aria-label="Toggle favorite">
              <Heart className={merged.favorite ? "h-4 w-4 fill-current" : "h-4 w-4"} />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(merged.status)}>
              {merged.status === "pending" ? "Pending" : merged.status === "watching" ? "Watching" : "Watched"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant={merged.status === "pending" ? "secondary" : "outline"} onClick={() => updateStatus("pending")}>
            Pending
          </Button>
          <Button type="button" variant={merged.status === "watching" ? "secondary" : "outline"} onClick={() => updateStatus("watching")}>
            Watching
          </Button>
          <Button type="button" variant={merged.status === "watched" ? "secondary" : "outline"} onClick={() => updateStatus("watched")}>
            Watched
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Priority</div>
            <Select value={merged.priority} onValueChange={(v) => updatePriority(v as WatchQueuePriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Rating</div>
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5" />
              <Input
                type="number"
                min={0}
                max={10}
                step={1}
                value={merged.personalRating ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  const next = v === "" ? null : Math.max(0, Math.min(10, Number(v)));
                  updateRating(next);
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Notes</div>
          <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} onBlur={updateNotes} placeholder="Your notes" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={remove} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
          <Button type="button" variant="secondary" className="gap-2" onClick={() => updateStatus(merged.status === "watched" ? "pending" : "watched")}>
            <Play className="h-4 w-4" />
            Toggle
          </Button>
        </div>
      </div>
    </div>
  );
}


