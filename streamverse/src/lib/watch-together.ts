import type {
  ParticipantResponses,
  RankedSuggestion,
  WatchSuggestion,
  WatchTogetherParticipant,
} from "@/types/watch-together";

export function suggestionKey(mediaType: string, mediaId: string): string {
  return `${mediaType}:${mediaId}`;
}

export function normalizeResponses(value: unknown): ParticipantResponses {
  if (!value || typeof value !== "object") return { suggestions: [], votes: [] };
  const raw = value as Partial<ParticipantResponses>;
  return {
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.filter((item): item is WatchSuggestion =>
      Boolean(item && typeof item === "object" && "key" in item && "mediaId" in item && "title" in item),
    ) : [],
    votes: Array.isArray(raw.votes) ? raw.votes.filter((vote): vote is string => typeof vote === "string") : [],
  };
}

/** Deterministically combines participant suggestions and one vote per participant/title. */
export function rankSuggestions(participants: WatchTogetherParticipant[]): RankedSuggestion[] {
  const suggestions = new Map<string, WatchSuggestion>();
  const voters = new Map<string, Set<string>>();
  for (const participant of participants) {
    for (const suggestion of participant.responses.suggestions) {
      if (!suggestions.has(suggestion.key)) suggestions.set(suggestion.key, suggestion);
    }
    for (const vote of new Set(participant.responses.votes)) {
      if (!voters.has(vote)) voters.set(vote, new Set());
      voters.get(vote)!.add(participant.id);
    }
  }
  return [...suggestions.values()]
    .map((suggestion) => ({ ...suggestion, voteCount: voters.get(suggestion.key)?.size ?? 0, rank: 0 }))
    .sort((a, b) => b.voteCount - a.voteCount || (b.voteAverage ?? 0) - (a.voteAverage ?? 0) || a.title.localeCompare(b.title))
    .map((suggestion, index) => ({ ...suggestion, rank: index + 1 }));
}

export function toggleVote(responses: ParticipantResponses, key: string): ParticipantResponses {
  const votes = new Set(responses.votes);
  if (votes.has(key)) votes.delete(key); else votes.add(key);
  return { ...responses, votes: [...votes] };
}
