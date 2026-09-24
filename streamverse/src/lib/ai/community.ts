import "server-only";
import { getAdminClient } from "@/lib/db-cache";

export interface CommunityTrend {
  moods: { name: string; score: number }[];
  themes: { name: string; score: number }[];
  topGenres: { name: string; score: number }[];
}

/**
 * Aggregates AI metadata from recently cached media items to determine
 * platform-wide trending moods, themes, and genres without requiring heavy
 * real-time aggregations or expensive external API calls.
 */
export async function getCommunityTrends(): Promise<CommunityTrend | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;

  try {
    const { data: media } = await supabase
      .from("media_items")
      .select("ai_metadata, normalized_data")
      .order("updated_at", { ascending: false })
      .limit(200);

    const moodsMap = new Map<string, number>();
    const themesMap = new Map<string, number>();
    const genresMap = new Map<string, number>();

    if (media) {
      for (const row of (media as any[])) {
        if (row.ai_metadata) {
          const meta = row.ai_metadata as any;
          if (Array.isArray(meta.mood)) {
            meta.mood.forEach((m: string) => moodsMap.set(m, (moodsMap.get(m) || 0) + 1));
          }
          if (Array.isArray(meta.themes)) {
            meta.themes.forEach((t: string) => themesMap.set(t, (themesMap.get(t) || 0) + 1));
          }
        }
        if (row.normalized_data) {
          const norm = row.normalized_data as any;
          if (Array.isArray(norm.genres)) {
            norm.genres.forEach((g: string) => genresMap.set(g, (genresMap.get(g) || 0) + 1));
          }
        }
      }
    }

    const sortMap = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, score]) => ({ name, score }));

    return {
      moods: sortMap(moodsMap),
      themes: sortMap(themesMap),
      topGenres: sortMap(genresMap),
    };
  } catch (error) {
    console.error("[Community] Failed to get trends:", error);
    return null;
  }
}
