import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { getWatchTogetherRoom } from "@/lib/watch-together-data";

export async function GET(_request: Request, ctx: RouteContext<"/api/watch-together/[code]">) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { code } = await ctx.params;
  const room = await getWatchTogetherRoom(code);
  return room ? NextResponse.json(room) : NextResponse.json({ error: "Room not found" }, { status: 404 });
}
