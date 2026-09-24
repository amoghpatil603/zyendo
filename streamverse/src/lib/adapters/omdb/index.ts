import "server-only";

import { safeFetch } from "@/lib/safe-fetch";

const OMDB_API_KEY = process.env.OMDB_API_KEY;

export interface OmdbEnrichment {
  imdbRating?: string;
  rottenTomatoesRating?: string;
  metacriticRating?: string;
  awards?: string;
  rated?: string;
}

export async function getOmdbEnrichment(imdbId: string): Promise<OmdbEnrichment | null> {
  if (!OMDB_API_KEY || !imdbId) return null;

  try {
    const response = await safeFetch(
      `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`,
      {
        timeout: 5000,
        maxAttempts: 1, // Don't retry excessively on enrichment
      },
    );

    if (!response.ok) return null;

    const data = await response.json().catch(() => null);

    if (!data || data.Response === "False") {
      return null;
    }

    let rottenTomatoesRating: string | undefined;
    let metacriticRating: string | undefined;

    if (Array.isArray(data.Ratings)) {
      for (const rating of data.Ratings) {
        if (rating.Source === "Rotten Tomatoes") {
          rottenTomatoesRating = rating.Value;
        } else if (rating.Source === "Metacritic") {
          metacriticRating = rating.Value;
        }
      }
    }

    return {
      imdbRating: data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : undefined,
      rottenTomatoesRating,
      metacriticRating: metacriticRating || (data.Metascore && data.Metascore !== "N/A" ? `${data.Metascore}/100` : undefined),
      awards: data.Awards && data.Awards !== "N/A" ? data.Awards : undefined,
      rated: data.Rated && data.Rated !== "N/A" ? data.Rated : undefined,
    };
  } catch (err) {
    console.warn(`[OMDb] Failed to enrich IMDb ID ${imdbId}:`, err);
    return null;
  }
}
