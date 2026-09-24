import { NextResponse } from "next/server";
import { getCollectionMembershipsForMedia } from "@/lib/collections";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get("mediaType");
  const mediaId = searchParams.get("mediaId");

  if (!mediaType || !mediaId) {
    return new NextResponse("Missing mediaType or mediaId", { status: 400 });
  }

  try {
    const memberships = await getCollectionMembershipsForMedia(mediaType, mediaId);
    return NextResponse.json(memberships);
  } catch (err) {
    console.error("Failed to fetch collection memberships", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
