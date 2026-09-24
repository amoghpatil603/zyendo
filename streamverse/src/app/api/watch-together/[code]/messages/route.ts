import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getWatchTogetherRoom } from "@/lib/watch-together-data";

const codeSchema = /^[a-z0-9]{12}$/;

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/watch-together/[code]/messages">,
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { code } = await ctx.params;
  if (!codeSchema.test(code)) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const room = await getWatchTogetherRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Verify user is a participant
  const isParticipant = room.participants.some(
    (p) => p.userId === user.id,
  );
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get messages with pagination (50 most recent)
  const supabase = await createSupabaseServerClient();
  const { data: messages, error } = await supabase
    .from("watch_session_messages")
    .select("id, user_id, display_name, avatar_url, body, created_at")
    .eq("session_id", room.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  // Return in chronological order (oldest first)
  const reversed = (messages ?? []).reverse();

  return NextResponse.json({
    messages: reversed.map((msg) => ({
      id: msg.id,
      userId: msg.user_id,
      displayName: msg.display_name,
      avatarUrl: msg.avatar_url,
      body: msg.body,
      createdAt: msg.created_at,
    })),
  });
}