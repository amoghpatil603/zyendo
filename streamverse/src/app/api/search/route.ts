import { NextResponse } from "next/server";
import { searchMulti, discoverMulti } from "@/lib/adapters/tmdb";
import { parseSearchIntent } from "@/lib/ai/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  if (!query) {
    return NextResponse.json({
      movies: [],
      tv: [],
      all: [],
      totalResults: 0,
      totalPages: 0,
    });
  }

  try {
    const intent = await parseSearchIntent(query);
    if (intent && intent.isIntent) {
      const results = await discoverMulti(
        intent.mediaType || "multi",
        intent.genreId,
        intent.keywords,
        page
      );
      // If discover found something, return it. Otherwise fall back to searchMulti
      if (results.all.length > 0) {
        return NextResponse.json(results);
      }
    }

    const results = await searchMulti(query, page);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API route failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
