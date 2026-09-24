"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Play,
  Search,
  Sparkles,
  Users,
  X,
  Film,
} from "lucide-react";
import { toast } from "sonner";

import {
  addToSharedQueueAction,
  joinWatchTogetherRoom,
  setWatchTogetherReady,
  startWatchTogetherRoom,
  endWatchTogetherRoom,
  leaveWatchTogetherRoom,
} from "@/app/actions/watch-together";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoomChat } from "@/components/watch-together/room-chat";
import { PlaybackControls } from "@/components/watch-together/playback-controls";
import { SharedQueue } from "@/components/watch-together/shared-queue";
import { usePlaybackController } from "@/lib/watch-together-playback";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { rankSuggestions } from "@/lib/watch-together";
import type { MediaItem } from "@/types/media-item";
import type { WatchTogetherRoom } from "@/types/watch-together";

export function WatchTogetherRoomView({
  initialRoom,
  currentUserId,
  inviteUrl,
}: {
  initialRoom: WatchTogetherRoom;
  currentUserId: string | null;
  inviteUrl: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const participant = room.participants.find(
    (item) => item.userId === currentUserId,
  );
  const ranked = useMemo(() => rankSuggestions(room.participants), [room]);
  const isHost = room.hostUserId === currentUserId;

  // WT-3: synchronized playback controller (host-authorized, realtime).
  const playback = usePlaybackController(room.id, isHost);

  // Determine room state
  const isWaiting = room.status === "open";
  const isEnded = room.status === "ended" || room.status === "closed";

  // Refresh room state after mutations that return a room
  async function refresh(
    result: Awaited<ReturnType<typeof joinWatchTogetherRoom>>,
  ) {
    if (result.ok) setRoom(result.room);
    else toast.error("That update couldn't be saved.");
  }
  function action(
    fn: () => Promise<Awaited<ReturnType<typeof joinWatchTogetherRoom>>>,
  ) {
    startTransition(async () => refresh(await fn()));
  }

  // Polling for room state refreshes
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/watch-together/${room.inviteCode}`, {
          cache: "no-store",
        });
        if (response.ok) setRoom(await response.json());
      } catch {
        /* Polling retries on the next interval. */
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [room.inviteCode]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `/api/watch-together/search?q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();
      setResults(response.ok ? data.items ?? [] : []);
      if (!response.ok) toast.error(data.error ?? "Search failed.");
    } finally {
      setSearching(false);
    }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Copy the link from your address bar.");
    }
  }

  // Lobby view (before watch starts)
  if (isWaiting && participant) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col gap-4 lg:flex-row">
        {/* Main content */}
        <div className="flex-1 space-y-6 overflow-y-auto">
          <section className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Watch Together Lobby</p>
              <h1 className="text-2xl font-bold">{room.name}</h1>
              {room.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {room.description}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {room.participants.length} / {room.maxParticipants} participants
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyInvite}>
                <Copy /> Invite
              </Button>
              {isHost && (
                <Button
                  disabled={isPending || room.participants.length === 0}
                  onClick={() => action(() => startWatchTogetherRoom(room.inviteCode))}
                >
                  <Play /> Start Watch Party
                </Button>
              )}
            </div>
          </section>

          {/* Search and WT-4 Shared Queue */}
          <section className="space-y-6">
            <form
              onSubmit={search}
              className="glass flex gap-2 rounded-2xl p-4"
            >
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search TMDB to suggest a title"
              />
              <Button type="submit" variant="secondary" disabled={searching}>
                {searching ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search />
                )}
              </Button>
            </form>
            {results.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await addToSharedQueueAction(
                          room.inviteCode,
                          {
                            mediaType: item.type as "movie" | "tv" | "anime",
                            mediaId: item.externalId,
                            title: item.title,
                            posterUrl: item.coverImageUrl,
                          },
                        );
                        if (result.ok) {
                          setQuery("");
                          setResults([]);
                          toast.success("Suggested!");
                        } else {
                          const err = result.error;
                          if (err === "forbidden") toast.error("You must join the room to suggest.");
                          else toast.error("Could not add suggestion.");
                        }
                      })
                    }
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-2 text-left hover:bg-muted"
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                      {item.coverImageUrl ? (
                        <Image
                          src={item.coverImageUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <span className="line-clamp-2 text-sm font-medium">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Shared Queue</h2>
              {currentUserId && (
                <SharedQueue
                  inviteCode={room.inviteCode}
                  sessionId={room.id}
                  currentUserId={currentUserId}
                  isHost={isHost}
                />
              )}
            </div>
          </section>

          <aside className="glass h-fit space-y-3 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users /> Participants
            </h2>
            {room.participants.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.displayName}
                  {item.userId === room.hostUserId ? " (host)" : ""}
                </span>
                {item.isReady ? (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Check className="size-4" /> Ready
                  </span>
                ) : (
                  <span className="text-muted-foreground">Voting</span>
                )}
              </div>
            ))}
            {participant && isWaiting && (
              <Button
                className="mt-2 w-full"
                variant={participant.isReady ? "outline" : "secondary"}
                disabled={isPending}
                onClick={() =>
                  action(() =>
                    setWatchTogetherReady(
                      room.inviteCode,
                      !participant.isReady,
                    ),
                  )
                }
              >
                {participant.isReady ? "Not ready yet" : "I'm ready"}
              </Button>
            )}
            {participant && (
              <Button
                className="mt-2 w-full"
                variant="ghost"
                disabled={isPending}
                onClick={() => action(() => leaveWatchTogetherRoom(room.inviteCode))}
              >
                <X /> Leave Room
              </Button>
            )}
          </aside>
        </div>

        {/* Chat panel - desktop side panel (only mounts on desktop) */}
        <div className="hidden w-80 lg:block">
          {currentUserId && participant && (
            <RoomChat
              sessionId={room.id}
              currentUserId={currentUserId}
              currentUserName={participant.displayName}
              currentUserAvatar={
                (participant.responses as any)?.avatarUrl ?? null
              }
            />
          )}
        </div>

        {/* Mobile chat button - only visible on mobile (only mounts on mobile) */}
        {currentUserId && participant && (
          <div className="lg:hidden">
            <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Open chat"
                  className="fixed bottom-20 right-4 z-40 shadow-lg"
                >
                  <MessageCircle />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] p-0">
                <SheetHeader className="border-b border-border/60 p-4">
                  <SheetTitle>Room Chat</SheetTitle>
                </SheetHeader>
                <RoomChat
                  sessionId={room.id}
                  currentUserId={currentUserId}
                  currentUserName={participant.displayName}
                  currentUserAvatar={
                    (participant.responses as any)?.avatarUrl ?? null
                  }
                />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    );
  }

  // Active watch view (room is in "active" status)
  if (room.status === "active" && participant) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col gap-4 lg:flex-row">
        {/* Main content */}
        <div className="flex-1 space-y-6 overflow-y-auto">
          <section className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Watch Party Active</p>
              <h1 className="text-2xl font-bold">{room.name}</h1>
              {room.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {room.description}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {room.participants.length} / {room.maxParticipants} participants
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyInvite}>
                <Copy /> Invite
              </Button>
              {isHost && (
                <Button
                  disabled={isPending}
                  onClick={() => action(() => endWatchTogetherRoom(room.inviteCode))}
                >
                  <X /> End Watch Party
                </Button>
              )}
            </div>
          </section>

          {/* Media Selection (if set) */}
          {room.mediaType && room.mediaId && (
            <section className="glass space-y-4 rounded-2xl p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Film className="size-5" /> Now Watching
              </h2>
              <p className="text-sm">
                {room.mediaType}: {room.mediaId}
              </p>
            </section>
          )}

          {/* Playback Controls - WT-3 synchronization infrastructure */}
          <section>
            <PlaybackControls controller={playback} isHost={isHost} />
          </section>

          {/* Shared Queue */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Shared Queue</h2>
            {currentUserId && (
              <SharedQueue
                inviteCode={room.inviteCode}
                sessionId={room.id}
                currentUserId={currentUserId}
                isHost={isHost}
              />
            )}
          </div>

          <aside className="glass h-fit space-y-3 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users /> Participants
            </h2>
            {room.participants.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.displayName}
                  {item.userId === room.hostUserId ? " (host)" : ""}
                </span>
              </div>
            ))}
            {participant && (
              <Button
                className="mt-2 w-full"
                variant="ghost"
                disabled={isPending}
                onClick={() => action(() => leaveWatchTogetherRoom(room.inviteCode))}
              >
                <X /> Leave Room
              </Button>
            )}
          </aside>
        </div>

        {/* Chat panel - desktop side panel (only mounts on desktop) */}
        <div className="hidden w-80 lg:block">
          {currentUserId && participant && (
            <RoomChat
              sessionId={room.id}
              currentUserId={currentUserId}
              currentUserName={participant.displayName}
              currentUserAvatar={
                (participant.responses as any)?.avatarUrl ?? null
              }
            />
          )}
        </div>

        {/* Mobile chat button - only visible on mobile (only mounts on mobile) */}
        {currentUserId && participant && (
          <div className="lg:hidden">
            <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Open chat"
                  className="fixed bottom-20 right-4 z-40 shadow-lg"
                >
                  <MessageCircle />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] p-0">
                <SheetHeader className="border-b border-border/60 p-4">
                  <SheetTitle>Room Chat</SheetTitle>
                </SheetHeader>
                <RoomChat
                  sessionId={room.id}
                  currentUserId={currentUserId}
                  currentUserName={participant.displayName}
                  currentUserAvatar={
                    (participant.responses as any)?.avatarUrl ?? null
                  }
                />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    );
  }

  // Ended/Closed view
  if (isEnded) {
    return (
      <div className="space-y-6">
        <section className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Watch Party Ended
            </p>
            <h1 className="text-2xl font-bold">{room.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {room.participants.length} participants
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyInvite}>
              <Copy /> Invite
            </Button>
          </div>
        </section>

        {room.results.length > 0 ? (
          <section className="glass space-y-4 rounded-2xl p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="size-5 text-primary" /> Room picks
            </h2>
            <div className="space-y-4">
              {room.results.map((result) => {
                const item = ranked.find(
                  (item) =>
                    item.mediaType === result.mediaType &&
                    item.mediaId === result.mediaId,
                );
                return (
                  <article
                    key={`${result.mediaType}:${result.mediaId}`}
                    className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-start"
                  >
                    <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-24">
                      {item?.coverImageUrl ? (
                        <Image
                          src={item.coverImageUrl}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {result.rank}
                        </span>
                        <p className="text-lg font-semibold">
                          {item?.title ?? `${result.mediaType} ${result.mediaId}`}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.reason}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {participant && (
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={() => action(() => leaveWatchTogetherRoom(room.inviteCode))}
          >
            <X /> Leave Room
          </Button>
        )}
      </div>
    );
  }

  // Not joined view
  if (!currentUserId) {
    return (
      <p className="glass rounded-xl p-5 text-sm text-muted-foreground">
        Sign in to join this room.
      </p>
    );
  }
  if (!participant && room.status === "open") {
    return (
      <div className="glass space-y-3 rounded-2xl p-6">
        <p>
          Join <strong>{room.name}</strong> to suggest and vote.
        </p>
        <Button
          onClick={() => action(() => joinWatchTogetherRoom(room.inviteCode))}
          disabled={isPending}
        >
          Join room
        </Button>
      </div>
    );
  }

  return null;
}