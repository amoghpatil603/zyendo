import { NextResponse } from "next/server";
import { semanticSearch } from "@/lib/discovery/semantic-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ semantic: false, query: "", items: [] });
  }

  try {
    const result = await semanticSearch(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Discover semantic search route failed:", error);
    return NextResponse.json({ semantic: false, query, items: [] }, { status: 200 });
  }
}
