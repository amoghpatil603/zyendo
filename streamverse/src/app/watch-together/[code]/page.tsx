import { notFound } from "next/navigation";

import { WatchTogetherRoomView } from "@/components/watch-together/watch-together-room";
import { PageContainer } from "@/components/common/page-container";
import { getCurrentUser } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { getWatchTogetherRoom } from "@/lib/watch-together-data";

export const dynamic = "force-dynamic";
export default async function WatchTogetherRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; const room = await getWatchTogetherRoom(code); if (!room) notFound(); const user = await getCurrentUser();
  return <PageContainer className="py-6"><WatchTogetherRoomView initialRoom={room} currentUserId={user?.id ?? null} inviteUrl={`${publicEnv.siteUrl}/watch-together/${room.inviteCode}`} /></PageContainer>;
}
