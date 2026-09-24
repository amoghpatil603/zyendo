import type { MediaType } from "@/types/media-item";

export interface WatchSuggestion {
  key: string;
  mediaType: MediaType;
  mediaId: string;
  title: string;
  coverImageUrl: string | null;
  voteAverage?: number;
  addedBy: string;
}

export interface ParticipantResponses {
  suggestions: WatchSuggestion[];
  votes: string[];
}

export interface WatchTogetherParticipant {
  id: string;
  userId: string | null;
  displayName: string;
  isReady: boolean;
  joinedAt: string;
  responses: ParticipantResponses;
}

export interface WatchTogetherResult {
  mediaType: MediaType;
  mediaId: string;
  rank: number;
  reason: string;
}

export type WatchTogetherRoomStatus = "open" | "active" | "closed" | "ended";

export interface WatchTogetherRoom {
  id: string;
  inviteCode: string;
  name: string;
  status: WatchTogetherRoomStatus;
  hostUserId: string | null;
  createdAt: string;
  isPublic: boolean;
  maxParticipants: number;
  mediaType: "movie" | "tv" | "anime" | null;
  mediaId: string | null;
  description: string | null;
  participants: WatchTogetherParticipant[];
  results: WatchTogetherResult[];
}

export interface RankedSuggestion extends WatchSuggestion {
  voteCount: number;
  rank: number;
}

// WT-2: Chat message types
export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

// WT-2: Emoji reaction types
export type ReactionType = "❤️" | "😂" | "😮" | "😢" | "🔥" | "👏";

export interface ReactionEvent {
  emoji: ReactionType;
  userId: string;
  displayName: string;
  sessionId: string;
  timestamp: number;
}

// WT-2: Typing indicator types
export interface TypingEvent {
  userId: string;
  displayName: string;
  sessionId: string;
  timestamp: number;
}

// WT-2: Presence state for Realtime
export interface PresenceState {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
  online: boolean;
}

// WT-3: Playback state types
export type PlaybackStatus = "playing" | "paused" | "stopped";

export interface PlaybackState {
  sessionId: string;
  status: PlaybackStatus;
  currentTime: number;
  playbackRate: number;
  updatedAt: string;
  sequence: number;
}

export interface PlaybackEvent {
  sessionId: string;
  action: "play" | "pause" | "seek" | "sync" | "rate";
  currentTime: number;
  playbackRate: number;
  sentAt: number;
  sequence: number;
}

// WT-3: Synchronization phase for UI status
//   idle         — not yet connected
//   connecting   — initial or late-join sync in progress ("Syncing")
//   reconnecting — realtime subscription lost, attempting to re-establish
//   synced       — playback state consistent with the authoritative host
//   out-of-sync  — drift detected, correcting toward authoritative position
//   error        — sync unavailable (e.g. Supabase not configured)
export type SyncPhase =
  | "idle"
  | "connecting"
  | "reconnecting"
  | "synced"
  | "out-of-sync"
  | "error";

// WT-3: Drift correction decision for player-independent infrastructure
export type DriftCorrection =
  | { kind: "none" }
  | { kind: "seek"; targetTime: number }
  | { kind: "rate-correct"; targetRate: number }
  | { kind: "apply-state" };

// WT-3: Player adapter interface
export interface PlaybackController {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  getState: () => {
    status: PlaybackStatus;
    currentTime: number;
    playbackRate: number;
  };
  onStateChange: (callback: (state: PlaybackState) => void) => () => void;
  // Player-independent: expose drift correction decision for player adapters.
  // Returns the correction action needed based on the last remote event.
  // If no real player is attached, this still calculates the decision.
  getDriftCorrection: () => DriftCorrection;
}
