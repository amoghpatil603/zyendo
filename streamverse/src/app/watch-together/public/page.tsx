import Link from "next/link";
import { Users, Globe, Film, Tv, Play } from "lucide-react";

import { PageContainer } from "@/components/common/page-container";
import { Button } from "@/components/ui/button";
import { getPublicWatchTogetherRooms } from "@/lib/watch-together-data";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = {
  title: "Public Watch Rooms",
  description: "Browse and join public watch parties",
};

export default async function PublicRoomsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <p className="text-center text-sm text-muted-foreground">
          Supabase not configured. Public rooms are unavailable.
        </p>
      </PageContainer>
    );
  }

  const rooms = await getPublicWatchTogetherRooms();

  return (
    <PageContainer className="space-y-6">
      <Header />
      {rooms.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No public rooms available. Create one to get started!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="glass flex flex-col justify-between rounded-2xl p-5"
            >
              <div className="space-y-2">
                <h2 className="font-semibold">{room.name}</h2>
                {room.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {room.description}
                  </p>
                )}
                {room.mediaType && room.mediaId && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {room.mediaType === "movie" ? (
                      <Film className="size-3" />
                    ) : (
                      <Tv className="size-3" />
                    )}
                    {room.mediaType}: {room.mediaId}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {room.participantCount} / {room.maxParticipants} participants
                </span>
                <Button asChild size="sm">
                  <Link href={`/watch-together/${room.inviteCode}`}>
                    <Play className="size-3" /> Join
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Header() {
  return (
    <header className="mx-auto max-w-2xl space-y-2 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Globe />
      </div>
      <h1 className="text-3xl font-bold">Public Watch Rooms</h1>
      <p className="text-muted-foreground">
        Join a public watch party or create your own.
      </p>
    </header>
  );
}