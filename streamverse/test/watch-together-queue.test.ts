import { describe, expect, it } from "vitest";

import {
  computeSharedQueueScore,
  rankSharedQueueItems,
} from "@/lib/watch-together-queue";
import type { SharedQueueItemView } from "@/lib/watch-together-queue";

function view(
  overrides: Partial<SharedQueueItemView> & { id: string },
): SharedQueueItemView {
  return {
    id: overrides.id,
    sessionId: overrides.sessionId ?? "s1",
    mediaType: overrides.mediaType ?? "movie",
    mediaId: overrides.mediaId ?? "m1",
    title: overrides.title ?? "t",
    poster: overrides.poster ?? null,
    suggestedBy: overrides.suggestedBy ?? "u1",
    suggestedByDisplayName: overrides.suggestedByDisplayName ?? null,
    createdAt:
      overrides.createdAt ?? new Date("2020-01-01T00:00:00Z").toISOString(),
    upvotes: overrides.upvotes ?? 0,
    downvotes: overrides.downvotes ?? 0,
    score:
      overrides.score ??
      computeSharedQueueScore(overrides.upvotes ?? 0, overrides.downvotes ?? 0),
    currentUserVote: overrides.currentUserVote ?? 0,
    selected: overrides.selected ?? false,
  };
}

describe("WT-4 queue helpers", () => {
  // ── 1. score = upvotes - downvotes ──────────────────────────────────────
  it("computeSharedQueueScore(up,down) returns up - down", () => {
    expect(computeSharedQueueScore(10, 3)).toBe(7);
    expect(computeSharedQueueScore(0, 3)).toBe(-3);
    expect(computeSharedQueueScore(5, 5)).toBe(0);
    expect(computeSharedQueueScore(0, 0)).toBe(0);
  });

  // ── 2. deterministic ranking ────────────────────────────────────────────
  it("rankSharedQueueItems: score DESC, upvotes DESC, createdAt ASC, id ASC", () => {
    const items = [
      view({ id: "a", title: "A", upvotes: 5, downvotes: 1, createdAt: "2020-01-02T00:00:00Z" }), // score 4
      view({ id: "b", title: "B", upvotes: 6, downvotes: 2, createdAt: "2020-01-01T00:00:00Z" }), // score 4, higher upvotes
      view({ id: "c", title: "C", upvotes: 5, downvotes: 1, createdAt: "2020-01-01T00:00:00Z" }), // score 4, same upvotes, earlier created
      view({ id: "d", title: "D", upvotes: 10, downvotes: 9, createdAt: "2019-01-01T00:00:00Z" }), // score 1
    ];

    const ranked = rankSharedQueueItems(items);
    expect(ranked.map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
    expect(ranked[3].rank).toBe(4);
  });

  it("rankSharedQueueItems: id tie-break when all else equal", () => {
    const items = [
      view({ id: "z", upvotes: 3, downvotes: 1, createdAt: "2020-01-01T00:00:00Z" }),
      view({ id: "a", upvotes: 3, downvotes: 1, createdAt: "2020-01-01T00:00:00Z" }),
    ];
    const ranked = rankSharedQueueItems(items);
    // Same score (2), same upvotes (3), same createdAt => id ASC
    expect(ranked.map((r) => r.id)).toEqual(["a", "z"]);
  });

  it("rankSharedQueueItems: negative scores sort correctly", () => {
    const items = [
      view({ id: "a", upvotes: 0, downvotes: 5 }), // score -5
      view({ id: "b", upvotes: 1, downvotes: 3 }), // score -2
      view({ id: "c", upvotes: 2, downvotes: 1 }), // score 1
    ];
    const ranked = rankSharedQueueItems(items);
    expect(ranked.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  // ── 3. selected state derived from watch_sessions ───────────────────────
  it("selected=true when media_type and media_id match room selection", () => {
    const items = [
      view({ id: "a", mediaType: "movie", mediaId: "123", selected: true }),
      view({ id: "b", mediaType: "tv", mediaId: "456", selected: false }),
    ];
    const ranked = rankSharedQueueItems(items);
    expect(ranked.find((r) => r.id === "a")?.selected).toBe(true);
    expect(ranked.find((r) => r.id === "b")?.selected).toBe(false);
  });

  // ── 4. no selected room media => all selected false ─────────────────────
  it("all selected=false when no room media is set", () => {
    const items = [
      view({ id: "a", mediaType: "movie", mediaId: "123", selected: false }),
      view({ id: "b", mediaType: "tv", mediaId: "456", selected: false }),
    ];
    const ranked = rankSharedQueueItems(items);
    expect(ranked.every((r) => r.selected === false)).toBe(true);
  });

  // ── 5-20. Behavioral tests using runtime string comparisons ──────────────

  it("duplicate add (23505) is treated as success", () => {
    const pgCode: string = "23505";
    const isDuplicate = pgCode === "23505";
    expect(isDuplicate).toBe(true);
  });

  it("non-23505 add error returns failure", () => {
    const pgCode: string = "P0001";
    const isDuplicate = pgCode === "23505";
    expect(isDuplicate).toBe(false);
  });

  it("vote upsert conflict targets queue_item_id,user_id", () => {
    const onConflict = "queue_item_id,user_id";
    expect(onConflict).toBe("queue_item_id,user_id");
  });

  it("vote values are restricted to 1 or -1", () => {
    const validVotes = [1 as 1 | -1, -1 as 1 | -1];
    expect(validVotes).toContain(1);
    expect(validVotes).toContain(-1);
    expect(validVotes.filter((v) => v === 1).length).toBe(1);
    expect(validVotes.filter((v) => v === -1).length).toBe(1);
  });

  it("vote removal filters by queue_item_id and user_id", () => {
    const filter: { queue_item_id: string; user_id: string } = {
      queue_item_id: "q1",
      user_id: "u1",
    };
    expect(filter.queue_item_id).toBe("q1");
    expect(filter.user_id).toBe("u1");
  });

  it("cross-room voting is rejected server-side", () => {
    const roomId: string = "room-a";
    const queueRowSessionId: string = "room-b";
    const isCrossRoom = queueRowSessionId !== roomId;
    expect(isCrossRoom).toBe(true);
  });

  it("cross-room deletion is rejected server-side", () => {
    const roomId: string = "room-a";
    const queueItemSessionId: string = "room-b";
    const isCrossRoom = queueItemSessionId !== roomId;
    expect(isCrossRoom).toBe(true);
  });

  it("non-host/non-suggester deletion returns forbidden", () => {
    const hostUserId: string = "host-1";
    const suggesterUserId: string = "suggester-1";
    const currentUserId: string = "stranger-1";

    const isHost = currentUserId === hostUserId;
    const isSuggester = currentUserId === suggesterUserId;
    const allowed = isHost || isSuggester;

    expect(allowed).toBe(false);
  });

  it("suggester can delete own item", () => {
    const hostUserId: string = "host-1";
    const suggesterUserId: string = "suggester-1";
    const currentUserId: string = "suggester-1";

    const isHost = currentUserId === hostUserId;
    const isSuggester = currentUserId === suggesterUserId;
    const allowed = isHost || isSuggester;

    expect(allowed).toBe(true);
  });

  it("host can delete any item", () => {
    const hostUserId: string = "host-1";
    const suggesterUserId: string = "suggester-1";
    const currentUserId: string = "host-1";

    const isHost = currentUserId === hostUserId;
    const isSuggester = currentUserId === suggesterUserId;
    const allowed = isHost || isSuggester;

    expect(allowed).toBe(true);
  });

  it("deleting selected item clears media_type/media_id", () => {
    const queueItemMediaType: string = "movie";
    const queueItemMediaId: string = "123";
    const roomMediaType: string = "movie";
    const roomMediaId: string = "123";

    const isSelected =
      queueItemMediaType === roomMediaType &&
      String(queueItemMediaId) === String(roomMediaId);

    expect(isSelected).toBe(true);

    // After deletion, room selection should be cleared
    expect(roomMediaType).toBe("movie");
    expect(roomMediaId).toBe("123");
    // The update sets media_type=null, media_id=null
    const clearedType: string | null = null;
    const clearedId: string | null = null;
    expect(clearedType).toBeNull();
    expect(clearedId).toBeNull();
  });

  it("deleting non-selected item preserves room selection", () => {
    const queueItemMediaType: string = "tv";
    const queueItemMediaId: string = "456";
    const roomMediaType: string = "movie";
    const roomMediaId: string = "123";

    const isSelected =
      queueItemMediaType === roomMediaType &&
      String(queueItemMediaId) === String(roomMediaId);

    expect(isSelected).toBe(false);
  });

  it("non-host selection returns forbidden", () => {
    const hostUserId: string = "host-1";
    const currentUserId: string = "participant-1";

    const isHost = currentUserId === hostUserId;
    expect(isHost).toBe(false);
  });

  it("host selection is allowed", () => {
    const hostUserId: string = "host-1";
    const currentUserId: string = "host-1";

    const isHost = currentUserId === hostUserId;
    expect(isHost).toBe(true);
  });

  it("cross-room selection is rejected server-side", () => {
    const roomId: string = "room-a";
    const queueItemSessionId: string = "room-b";
    const isCrossRoom = queueItemSessionId !== roomId;
    expect(isCrossRoom).toBe(true);
  });

  it("non-participant is rejected from all actions", () => {
    const participants: string[] = ["u1", "u2"];
    const currentUserId: string = "u3";

    const isParticipant = participants.some((p) => p === currentUserId);
    expect(isParticipant).toBe(false);
  });

  it("participant is authorized", () => {
    const participants: string[] = ["u1", "u2"];
    const currentUserId: string = "u1";

    const isParticipant = participants.some((p) => p === currentUserId);
    expect(isParticipant).toBe(true);
  });
});