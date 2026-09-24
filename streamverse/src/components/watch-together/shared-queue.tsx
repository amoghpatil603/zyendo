"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Play,
  Loader2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  addToSharedQueueAction,
  removeFromSharedQueueAction,
  voteOnQueueItemAction,
  removeQueueVoteAction,
  selectQueueItemAction,
  getSharedQueueAction,
} from "@/app/actions/watch-together";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { RankedSharedQueueItem } from "@/lib/watch-together-queue";

interface SharedQueueProps {
  inviteCode: string;
  sessionId: string;
  currentUserId: string;
  isHost: boolean;
  /** Triggered after any successful mutation so the parent can optionally refresh. */
  onMutation?: () => void;
}

// ── Stale-request guard ────────────────────────────────────────────────────
function useRefetchGuard() {
  const reqId = useRef(0);
  return {
    next: () => ++reqId.current,
    guard: (id: number) => id === reqId.current,
  };
}

// ── Realtime hook ──────────────────────────────────────────────────────────
function useQueueRealtime(
  sessionId: string,
  onTrigger: () => void,
) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createSupabaseBrowserClient();
    const channelName = `wt4-queue:${sessionId}`;

    const channel = supabase.channel(channelName);

    // Watch for queue item inserts/deletes
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "watch_session_queue",
        filter: `session_id=eq.${sessionId}`,
      },
      () => onTrigger(),
    );

    // Watch for vote changes — cannot filter directly by session_id on the
    // vote table, so we subscribe broadly and rely on refetch for filtering.
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "watch_session_queue_votes",
      },
      () => onTrigger(),
    );

    // Watch for selection changes on this session
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "watch_sessions",
        filter: `id=eq.${sessionId}`,
      },
      () => onTrigger(),
    );

    channel.subscribe();

    initialized.current = true;

    return () => {
      supabase.removeChannel(channel);
      initialized.current = false;
    };
  }, [sessionId, onTrigger]);
}

// ── Component ──────────────────────────────────────────────────────────────
export function SharedQueue({
  inviteCode,
  sessionId,
  currentUserId,
  isHost,
  onMutation,
}: SharedQueueProps) {
  const [items, setItems] = useState<RankedSharedQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, startMutate] = useTransition();
  const guard = useRefetchGuard();
  const [refreshTick, setRefreshTick] = useState(0);

  // Trigger a refetch
  const doRefresh = () => {
    const id = guard.next();
    setLoading(true);
    getSharedQueueAction(inviteCode).then((result) => {
      if (!guard.guard(id)) return;
      if (result.ok) setItems(result.items);
      setLoading(false);
    });
  };

  // Initial load + reload on tick change
  useEffect(() => {
    doRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, refreshTick]);

  // Realtime
  useQueueRealtime(sessionId, () => {
    setRefreshTick((t) => t + 1);
  });

  function handleMutation<T>(promise: Promise<T>, onOk?: () => void) {
    startMutate(async () => {
      const result = await promise;
      if (typeof result === "object" && result !== null && "ok" in result) {
        if ((result as any).ok) {
          onMutation?.();
          onOk?.();
        } else {
          const err = (result as any).error as string | undefined;
          if (err === "unauthenticated") toast.error("Please sign in.");
          else if (err === "forbidden") toast.error("You don't have permission.");
          else if (err === "not_found") toast.error("Not found.");
          else if (err === "failed") toast.error("Something went wrong.");
          else toast.error("Something went wrong.");
        }
      }
      doRefresh();
    });
  }

  async function handleVote(
    queueItemId: string,
    currentVote: number,
    targetVote: 1 | -1,
  ) {
    if (currentVote === targetVote) {
      // Remove vote
      handleMutation(removeQueueVoteAction(inviteCode, queueItemId));
    } else {
      // Vote (or change vote)
      handleMutation(
        voteOnQueueItemAction(inviteCode, {
          queueItemId,
          vote: targetVote,
        }),
      );
    }
  }

  function handleSelect(queueItemId: string) {
    handleMutation(selectQueueItemAction(inviteCode, queueItemId));
  }

  function handleRemove(queueItemId: string) {
    handleMutation(removeFromSharedQueueAction(inviteCode, queueItemId));
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No suggestions yet. Search for a movie or show to get the room
          started.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isSelected = item.selected;
            const myVote = item.currentUserVote;

            return (
              <article
                key={item.id}
                className={`flex items-center gap-4 rounded-xl border p-3 sm:p-4 ${
                  isSelected
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/60 bg-card/50"
                }`}
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded bg-muted sm:w-16">
                  {item.poster ? (
                    <Image
                      src={item.poster}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium sm:text-lg">
                    {item.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 uppercase">
                      {item.mediaType}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {item.suggestedByDisplayName ?? "Unknown"}
                    </span>
                    <span>
                      Score: {item.score} ({item.upvotes}↑ / {item.downvotes}↓)
                    </span>
                    {isSelected && (
                      <span className="text-primary font-semibold">
                        ● Now Playing
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  {/* Upvote */}
                  <Button
                    size="icon-sm"
                    variant={myVote === 1 ? "default" : "ghost"}
                    disabled={mutating}
                    onClick={() => handleVote(item.id, myVote, 1)}
                    aria-label="Upvote"
                  >
                    <ChevronUp className="size-4" />
                  </Button>

                  {/* Downvote */}
                  <Button
                    size="icon-sm"
                    variant={myVote === -1 ? "default" : "ghost"}
                    disabled={mutating}
                    onClick={() => handleVote(item.id, myVote, -1)}
                    aria-label="Downvote"
                  >
                    <ChevronDown className="size-4" />
                  </Button>

                  {/* Host: Select */}
                  {isHost && !isSelected && (
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      disabled={mutating}
                      onClick={() => handleSelect(item.id)}
                      aria-label="Select to play"
                    >
                      <Play className="size-4" />
                    </Button>
                  )}

                  {/* Host or suggester: Delete */}
                  {(isHost || item.suggestedBy === currentUserId) && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={mutating}
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove from queue"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}