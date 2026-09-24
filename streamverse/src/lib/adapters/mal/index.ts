import "server-only";

import { safeFetch } from "@/lib/safe-fetch";

const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;

export interface MalAnimeEnrichment {
  malId: string;
  malScore?: number;
  malRank?: number;
  malPopularity?: number;
  episodes?: number;
  airingStatus?: string;
  studios?: string[];
}

/**
 * Attempt to find MAL metadata using a TMDB title.
 * In a real-world scenario with more time, you would maintain a mapping database 
 * or use an external mapping API (like Arm-based MAL ID mappings).
 * 
 * Here we do a lightweight title-based search fallback, grabbing the top result.
 */
export async function getMalEnrichmentByTitle(title: string, year?: string): Promise<MalAnimeEnrichment | null> {
  if (!MAL_CLIENT_ID || !title) return null;

  try {
    const q = encodeURIComponent(title);
    const response = await safeFetch(
      `https://api.myanimelist.net/v2/anime?q=${q}&limit=5&fields=id,title,mean,rank,popularity,num_episodes,status,studios,start_date`,
      {
        headers: {
          "X-MAL-CLIENT-ID": MAL_CLIENT_ID,
        },
        timeout: 5000,
        maxAttempts: 1,
      },
    );

    if (!response.ok) return null;

    const data = await response.json().catch(() => null);

    if (!data || !data.data || data.data.length === 0) return null;

    let bestMatch = data.data[0].node;

    // Optional: if year provided, try to match it more closely
    if (year) {
      const matchedByYear = data.data.find((item: any) =>
        item.node.start_date && item.node.start_date.startsWith(year),
      );
      if (matchedByYear) bestMatch = matchedByYear.node;
    }

    return {
      malId: bestMatch.id.toString(),
      malScore: bestMatch.mean,
      malRank: bestMatch.rank,
      malPopularity: bestMatch.popularity,
      episodes: bestMatch.num_episodes,
      airingStatus: bestMatch.status,
      studios: bestMatch.studios?.map((s: any) => s.name) || [],
    };
  } catch (err) {
    console.warn(`[MAL] Failed to enrich anime by title ${title}:`, err);
    return null;
  }
}
