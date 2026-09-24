import "server-only";

import type {
  MediaDetail,
  MediaItem,
  Trailer,
  WatchProvider,
} from "@/types/media-item";
import { tmdbImageUrl } from "./client";
import type {
  TmdbCredits,
  TmdbMovieDetail,
  TmdbMovieSummary,
  TmdbTvDetail,
  TmdbTvSummary,
  TmdbVideo,
  TmdbWatchProviderRegion,
} from "./types";

function mapPeople(credits: TmdbCredits | undefined) {
  if (!credits) return [];
  const cast = (credits.cast ?? []).slice(0, 15).map((member) => ({
    name: member.name,
    role: member.character ? `as ${member.character}` : "Cast",
    imageUrl: tmdbImageUrl(member.profile_path, "w185") ?? undefined,
    externalId: String(member.id),
  }));
  const keyCrew = (credits.crew ?? [])
    .filter((member) =>
      ["Director", "Creator", "Writer", "Screenplay"].includes(
        member.job ?? "",
      ),
    )
    .slice(0, 6)
    .map((member) => ({
      name: member.name,
      role: member.job ?? "Crew",
      imageUrl: tmdbImageUrl(member.profile_path, "w185") ?? undefined,
      externalId: String(member.id),
    }));
  return [...keyCrew, ...cast];
}

function mapTrailers(videos: { results: TmdbVideo[] } | undefined): Trailer[] {
  if (!videos?.results) return [];
  return videos.results
    .filter((v) => v.site === "YouTube" && v.type === "Trailer")
    .sort((a, b) => Number(b.official) - Number(a.official))
    .map((v) => ({ key: v.key, site: "YouTube", name: v.name }));
}

function mapWatchProviders(
  data: { results: Record<string, TmdbWatchProviderRegion> } | undefined,
  region: string,
): { providers: WatchProvider[]; link?: string } {
  const regionData = data?.results?.[region] ?? data?.results?.US;
  if (!regionData) return { providers: [] };
  const collect = (
    list: TmdbWatchProviderRegion["flatrate"],
    type: WatchProvider["type"],
  ): WatchProvider[] =>
    (list ?? []).map((p) => ({
      name: p.provider_name,
      logoUrl: tmdbImageUrl(p.logo_path, "w92") ?? undefined,
      type,
    }));

  const providers = [
    ...collect(regionData.free, "free"),
    ...collect(regionData.flatrate, "stream"),
    ...collect(regionData.rent, "rent"),
    ...collect(regionData.buy, "buy"),
  ];
  return { providers, link: regionData.link };
}

export function mapMovieSummary(
  m: TmdbMovieSummary,
  genreLookup?: Map<number, string>,
): MediaItem {
  return {
    id: `movie:${m.id}`,
    type: "movie",
    title: m.title,
    coverImageUrl: tmdbImageUrl(m.poster_path, "w500"),
    backdropImageUrl: tmdbImageUrl(m.backdrop_path, "w1280"),
    synopsis: m.overview ?? "",
    source: "tmdb",
    externalId: String(m.id),
    genres: (m.genre_ids ?? [])
      .map((id) => genreLookup?.get(id))
      .filter((name): name is string => Boolean(name)),
    people: [],
    releaseDate: m.release_date || undefined,
    voteAverage: m.vote_average,
  };
}

export function mapTvSummary(
  t: TmdbTvSummary,
  genreLookup?: Map<number, string>,
): MediaItem {
  return {
    id: `tv:${t.id}`,
    type: "tv",
    title: t.name,
    coverImageUrl: tmdbImageUrl(t.poster_path, "w500"),
    backdropImageUrl: tmdbImageUrl(t.backdrop_path, "w1280"),
    synopsis: t.overview ?? "",
    source: "tmdb",
    externalId: String(t.id),
    genres: (t.genre_ids ?? [])
      .map((id) => genreLookup?.get(id))
      .filter((name): name is string => Boolean(name)),
    people: [],
    releaseDate: t.first_air_date || undefined,
    voteAverage: t.vote_average,
  };
}

export function mapMovieDetail(m: TmdbMovieDetail, region: string): MediaDetail {
  const { providers, link } = mapWatchProviders(m["watch/providers"], region);
  return {
    ...mapMovieSummary(m),
    genres: (m.genres ?? []).map((g) => g.name),
    people: mapPeople(m.credits),
    runtimeMinutes: m.runtime ?? undefined,
    tagline: m.tagline || undefined,
    status: m.status,
    homepage: m.homepage || undefined,
    originalLanguage: m.original_language,
    trailers: mapTrailers(m.videos),
    watchProviders: providers,
    watchLink: link,
    similar: (m.similar?.results ?? m.recommendations?.results ?? [])
      .slice(0, 12)
      .map((s) => mapMovieSummary(s)),
  };
}

export function mapTvDetail(t: TmdbTvDetail, region: string): MediaDetail {
  const { providers, link } = mapWatchProviders(t["watch/providers"], region);
  return {
    ...mapTvSummary(t),
    genres: (t.genres ?? []).map((g) => g.name),
    people: mapPeople(t.credits),
    runtimeMinutes: t.episode_run_time?.[0] ?? undefined,
    tagline: t.tagline || undefined,
    status: t.status,
    homepage: t.homepage || undefined,
    originalLanguage: t.original_language,
    trailers: mapTrailers(t.videos),
    watchProviders: providers,
    watchLink: link,
    numberOfSeasons: t.number_of_seasons,
    numberOfEpisodes: t.number_of_episodes,
    seasons: (t.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        airDate: s.air_date ?? undefined,
        posterUrl: tmdbImageUrl(s.poster_path, "w342"),
        overview: s.overview,
      })),
    similar: (t.similar?.results ?? t.recommendations?.results ?? [])
      .slice(0, 12)
      .map((s) => mapTvSummary(s)),
  };
}
