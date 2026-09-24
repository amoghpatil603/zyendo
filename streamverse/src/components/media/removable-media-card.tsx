import type { MediaItem } from "@/types/media-item";
import { MediaCard } from "./media-card";
import { WatchlistButton } from "./watchlist-button";

/** A media card with a persistent watchlist toggle overlaid (used on My World). */
export function RemovableMediaCard({ item }: { item: MediaItem }) {
  return (
    <div className="relative">
      <MediaCard item={item} />
      <div className="absolute right-2 top-2 z-10">
        <WatchlistButton
          mediaType={item.type}
          mediaId={item.externalId}
          initialInWatchlist
          isAuthenticated
          variant="icon"
        />
      </div>
    </div>
  );
}
