import { NextResponse } from "next/server";

import { isTmdbConfigured } from "@/lib/env";
import { searchMulti } from "@/lib/adapters/tmdb";

export async function GET(request: Request) {
  if (!isTmdbConfigured()) return NextResponse.json({ error: "TMDB not configured" }, { status: 503 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json({ items: [] });
  try { return NextResponse.json({ items: (await searchMulti(query)).all.slice(0, 8) }); }
  catch { return NextResponse.json({ error: "Search failed" }, { status: 502 }); }
}
