import type { MediaItem, MediaType } from "@/types/media-item";

/** Build the internal detail-page href for a media item. */
export function mediaHref(item: Pick<MediaItem, "type" | "externalId">): string {
  return detailHref(item.type, item.externalId);
}

export function detailHref(type: MediaType, externalId: string): string {
  switch (type) {
    case "movie":
      return `/movies/${externalId}`;
    case "tv":
      return `/tv/${externalId}`;
    default:
      return `/${type}/${externalId}`;
  }
}
