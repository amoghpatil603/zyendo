/** Formatting helpers shared across the UI. */

export function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatYear(date?: string): string | null {
  if (!date) return null;
  const year = date.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

export function formatDate(date?: string): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRating(voteAverage?: number): string | null {
  if (voteAverage === undefined || voteAverage <= 0) return null;
  return voteAverage.toFixed(1);
}

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv: "TV",
  anime: "Anime",
  music: "Music",
};

export function mediaTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}
