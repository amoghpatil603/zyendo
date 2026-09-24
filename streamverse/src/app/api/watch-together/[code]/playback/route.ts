import { NextResponse } from "next/server";

import { getPlaybackState, updatePlaybackState } from "@/app/actions/watch-together";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const codeSchema = /^[a-z0-9]{12}$/;
const updateSchema = (() => {
  // Inline validation mirrors playbackStateSchema in the server action.
  const isStatus = (v: unknown) => v === "playing" || v === "paused" || v === "stopped";
  return {
    safeParse(body: unknown) {
      if (typeof body !== "object" || body === null) return { success: false as const };
      const b = body as Record<string, unknown>;
      if (!isStatus(b.status)) return { success: false as const };
      if (typeof b.currentTime !== "number" || b.currentTime < 0) return { success: false as const };
      if (typeof b.playbackRate !== "number" || b.playbackRate < 0.1 || b.playbackRate > 4)
        return { success: false as const };
      if (typeof b.sequence !== "number") return { success: false as const };
      return {
        success: true as const,
        data: {
          status: b.status,
          currentTime: b.currentTime,
          playbackRate: b.playbackRate,
          sequence: b.sequence,
        },
      };
    },
  };
})();

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/watch-together/[code]/playback">,
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const { code } = await ctx.params;
  if (!codeSchema.test(code)) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const result = await getPlaybackState(code);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ state: result.state });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/watch-together/[code]/playback">,
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const { code } = await ctx.params;
  if (!codeSchema.test(code)) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid playback update" }, { status: 400 });
  }

  // Type assertion is safe here because updateSchema validates status is one of the allowed values
  const result = await updatePlaybackState(code, parsed.data as {
    status: "playing" | "paused" | "stopped";
    currentTime: number;
    playbackRate: number;
    sequence: number;
  });
  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "forbidden"
          ? 403
          : result.error === "unconfigured"
            ? 503
            : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ state: result.state });
}
