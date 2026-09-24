import { NextResponse } from "next/server";

import { getTvSeason } from "@/lib/adapters/tmdb";
import { isTmdbConfigured } from "@/lib/env";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/tv/[id]/seasons/[season]">,
) {
  if (!isTmdbConfigured()) {
    return NextResponse.json({ error: "TMDB not configured" }, { status: 503 });
  }

  const { id, season } = await ctx.params;
  const seasonNumber = Number(season);
  if (Number.isNaN(seasonNumber)) {
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  }

  try {
    const episodes = await getTvSeason(id, seasonNumber);
    return NextResponse.json({ episodes });
  } catch (error) {
    console.error("[streamverse] season fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to load season" },
      { status: 502 },
    );
  }
}
