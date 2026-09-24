"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  PlaybackEvent,
  PlaybackState,
  PlaybackStatus,
  PlaybackController,
  SyncPhase,
  DriftCorrection,
} from "@/types/watch-together";

// Centralized, non-overlapping drift thresholds.
// Every possible drift value maps to exactly one correction decision.
const DRIFT_THRESHOLD_SMALL = 0.5; // seconds — ignore, we track continuous playback
const DRIFT_THRESHOLD_MEDIUM = 1.5; // seconds — rate-correct if player supports it

const BROADCAST_EVENT = "playback" as const;

type Channel = ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]>;

/**
 * Shared synchronized-playback controller.
 *
 * This implements the *realtime synchronization infrastructure* (state
 * persistence, host-authorized events, sequence/version protection, stale-event
 * rejection, remote-update suppression, reconnect + late-join sync, and drift
 * correction). It deliberately does NOT depend on any specific video element:
 * the `PlaybackController` interface is the integration seam. A controllable
 * player (e.g. a YouTube IFrame API player or an HTML5 video element wired
 * through the adapter in `playback-adapters/`) would be attached to
 * `play/pause/seek` to achieve actual synchronized media; without it, this
 * layer still keeps every participant's view of playback state consistent.
 */
export function usePlaybackController(
  sessionId: string,
  isHost: boolean,
  onRemoteUpdate?: (state: PlaybackState) => void,
): PlaybackController & { syncPhase: SyncPhase } {
  const [state, setState] = useState<PlaybackState>({
    sessionId,
    status: "paused",
    currentTime: 0,
    playbackRate: 1,
    updatedAt: new Date().toISOString(),
    sequence: 0,
  });
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");

  // Refs keep the realtime handler reading live values without re-subscribing.
  const stateRef = useRef(state);
  stateRef.current = state;
  const isApplyingRemoteUpdateRef = useRef(false);
  const channelRef = useRef<Channel | null>(null);
  const sequenceRef = useRef(0);
  const hostRef = useRef(isHost);
  hostRef.current = isHost;
  const remoteUpdateRef = useRef(onRemoteUpdate);
  remoteUpdateRef.current = onRemoteUpdate;
  // Tracks the last known host so host-transfer authority can be bootstrapped.
  const wasHostRef = useRef(isHost);
  // Track the last remote event for drift correction decisions.
  const lastRemoteEventRef = useRef<PlaybackEvent | null>(null);

  // Expected playback position given continuous playback since the last update.
  // Uses the authoritative state's updatedAt to calculate where we should be now.
  function calculateExpectedTime(
    currentTime: number,
    status: PlaybackStatus,
    playbackRate: number,
    updatedAt: string,
  ): number {
    if (status !== "playing") return currentTime;
    const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 1000;
    return currentTime + elapsed * playbackRate;
  }

  // 1) Load initial (late-join) playback state + on host authority transfer.
  const syncFromServer = useCallback(async () => {
    setSyncPhase((prev) => (prev === "error" ? "reconnecting" : "connecting"));
    try {
      const response = await fetch(`/api/watch-together/${sessionId}/playback`);
      if (!response.ok) {
        setSyncPhase("error");
        return;
      }
      const data = await response.json();
      if (data.state) {
        // 6) Sequence/version: adopt the authoritative server sequence so we
        //    never replay or reject newer authoritative events.
        sequenceRef.current = data.state.sequence ?? 0;
        const next: PlaybackState = data.state;
        setState(next);
        stateRef.current = next;
        remoteUpdateRef.current?.(next);
      }
      setSyncPhase("synced");
    } catch {
      setSyncPhase("error");
    }
  }, [sessionId]);

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  // When this client gains host authority (e.g. previous host left), re-sync
  // the authoritative sequence from the server so its next broadcast wins.
  useEffect(() => {
    if (isHost && !wasHostRef.current) {
      void syncFromServer();
    }
    wasHostRef.current = isHost;
  }, [isHost, syncFromServer]);

  // 2) Realtime subscription on the SAME channel WT-2 uses (room:<id>),
  //    so a single channel carries chat/typing/reactions AND playback.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`room:${sessionId}`);

    // Typed broadcast listener: the RealtimeChannel `on("broadcast", { event })`
    // overload carries the decoded payload on `payload`. No broad `as any`.
    channel.on(
      "broadcast",
      { event: BROADCAST_EVENT },
      (message: { payload: PlaybackEvent }) => {
        const event = message.payload;
        if (!event || event.sessionId !== sessionId) return;

        // 5) Stale-event rejection: drop events not strictly newer than our
        //    known sequence. Monotonic sequence prevents out-of-order replays.
        if (typeof event.sequence === "number" && event.sequence <= sequenceRef.current) {
          return;
        }

        // 6) Remote-update suppression: mark that this local state mutation is
        //    remote-driven so locally-originated changes aren't echoed back.
        isApplyingRemoteUpdateRef.current = true;

        const prev = stateRef.current;

        // Determine the authoritative status from the event action.
        const authoritativeStatus: PlaybackStatus =
          event.action === "play"
            ? "playing"
            : event.action === "pause"
              ? "paused"
              : prev.status; // For seek/rate, maintain current status

        // Calculate expected time from authoritative state.
        // For play/pause, use the event's sentAt as the reference point.
        // For seek, the currentTime is the target position.
        const expectedTime =
          event.action === "seek"
            ? event.currentTime
            : calculateExpectedTime(
                event.currentTime,
                authoritativeStatus,
                event.playbackRate,
                new Date(event.sentAt).toISOString(),
              );

        // Drift is the difference between expected and local player position.
        // The local player position is the state's currentTime (which represents
        // the last known position of the local player).
        const drift = expectedTime - prev.currentTime;

        // 8) Tiered drift correction strategy.
        let nextCurrentTime = prev.currentTime;
        let nextStatus: PlaybackStatus =
          event.action === "play"
            ? "playing"
            : event.action === "pause"
              ? "paused"
              : prev.status;

        if (event.action === "seek") {
          // EXPLICIT SEEK EVENT: Apply immediately regardless of drift threshold.
          nextCurrentTime = event.currentTime;
          setSyncPhase("synced");
        } else if (Math.abs(drift) > DRIFT_THRESHOLD_MEDIUM) {
          // MEDIUM_DRIFT (>1.5s): Seek to expectedTime using PlaybackController.
          // Show temporary "out-of-sync" status, return to "synced" after correction.
          nextCurrentTime = expectedTime;
          setSyncPhase("out-of-sync");
          window.setTimeout(
            () => setSyncPhase((p) => (p === "out-of-sync" ? "synced" : p)),
            1500,
          );
        } else {
          // SMALL_DRIFT (≤1.5s): Ignore. Do not seek. Keep status "synced".
          setSyncPhase("synced");
        }

        // PLAY / PAUSE: Apply the authoritative playback state.
        // Do not unnecessarily seek if position drift is below the correction threshold.
        // (Already handled above - we only seek for large drift)

        // RATE CHANGE: Apply authoritative playbackRate if supported.
        // (Already handled in the nextState below)

        // Store the event for drift correction queries.
        lastRemoteEventRef.current = event;

        const nextState: PlaybackState = {
          sessionId,
          status: nextStatus,
          currentTime: nextCurrentTime,
          playbackRate: event.playbackRate ?? prev.playbackRate,
          updatedAt: new Date().toISOString(),
          sequence: event.sequence,
        };
        sequenceRef.current = event.sequence;
        setState(nextState);
        stateRef.current = nextState;
        remoteUpdateRef.current?.(nextState);

        // 6) Event-loop prevention: clear the suppression flag after the state
        //    settles so locally-originated changes aren't echoed back.
        window.setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;
        }, 120);
      },
    );

    channel.subscribe((status) => {
      // 7) Reconnect synchronization: reflect subscription health in the UI.
      if (status === "SUBSCRIBED") {
        setSyncPhase((prev) => (prev === "idle" ? "synced" : prev));
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setSyncPhase("reconnecting");
      }
    });
    channelRef.current = channel;

    return () => {
      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId]);

  // 3) Host-authorized broadcast + persistence.
  const broadcastEvent = useCallback(
    (event: PlaybackEvent) => {
      if (!hostRef.current || isApplyingRemoteUpdateRef.current) return;
      // 6) Sequence/version protection: always advance the monotonic sequence.
      const seq = sequenceRef.current + 1;
      sequenceRef.current = seq;
      const fullEvent: PlaybackEvent = { ...event, sequence: seq };

      // Typed channel.send: { type: "broadcast", event, payload }. Narrowed
      // payload type keeps the runtime API verified without a broad cast.
      void channelRef.current
        ?.send({
          type: "broadcast",
          event: BROADCAST_EVENT,
          payload: fullEvent,
        })
        .catch(() => {
          /* realtime is best-effort; persistence still records the update */
        });

      // Persist authoritative state so late-joiners and reconnects see it.
      const status: PlaybackState["status"] =
        fullEvent.action === "play"
          ? "playing"
          : fullEvent.action === "pause"
            ? "paused"
            : fullEvent.action === "rate"
              ? stateRef.current.status
              : "paused";
      void fetch(`/api/watch-together/${sessionId}/playback`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          currentTime: fullEvent.currentTime,
          playbackRate: fullEvent.playbackRate,
          sequence: seq,
        }),
      }).catch(() => {
        /* persistence is best-effort; realtime already propagated */
      });
    },
    [sessionId],
  );

  const play = useCallback(() => {
    if (!hostRef.current) return;
    const now = Date.now();
    const nextState: PlaybackState = {
      ...stateRef.current,
      status: "playing",
      updatedAt: new Date().toISOString(),
    };
    setState(nextState);
    stateRef.current = nextState;
    broadcastEvent({
      sessionId,
      action: "play",
      currentTime: nextState.currentTime,
      playbackRate: nextState.playbackRate,
      sentAt: now,
      sequence: sequenceRef.current + 1,
    });
  }, [broadcastEvent, sessionId]);

  const pause = useCallback(() => {
    if (!hostRef.current) return;
    const now = Date.now();
    const nextState: PlaybackState = {
      ...stateRef.current,
      status: "paused",
      updatedAt: new Date().toISOString(),
    };
    setState(nextState);
    stateRef.current = nextState;
    broadcastEvent({
      sessionId,
      action: "pause",
      currentTime: nextState.currentTime,
      playbackRate: nextState.playbackRate,
      sentAt: now,
      sequence: sequenceRef.current + 1,
    });
  }, [broadcastEvent, sessionId]);

  const seek = useCallback(
    (time: number) => {
      if (!hostRef.current) return;
      const now = Date.now();
      const nextState: PlaybackState = {
        ...stateRef.current,
        currentTime: time,
        updatedAt: new Date().toISOString(),
      };
      setState(nextState);
      stateRef.current = nextState;
      broadcastEvent({
        sessionId,
        action: "seek",
        currentTime: time,
        playbackRate: nextState.playbackRate,
        sentAt: now,
        sequence: sequenceRef.current + 1,
      });
    },
    [broadcastEvent, sessionId],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (!hostRef.current) return;
      const now = Date.now();
      const nextState: PlaybackState = {
        ...stateRef.current,
        playbackRate: rate,
        updatedAt: new Date().toISOString(),
      };
      setState(nextState);
      stateRef.current = nextState;
      broadcastEvent({
        sessionId,
        action: "rate",
        currentTime: nextState.currentTime,
        playbackRate: rate,
        sentAt: now,
        sequence: sequenceRef.current + 1,
      });
    },
    [broadcastEvent, sessionId],
  );

  // Player-independent: expose drift correction decision for player adapters.
  // This calculates the correction based on the last remote event and current state.
  // Returns "rate-correct" for medium drift (0.5s < drift ≤ 1.5s) to allow
  // player adapters to apply temporary playback-rate correction if supported.
  const getDriftCorrection = useCallback((): DriftCorrection => {
    const event = lastRemoteEventRef.current;
    if (!event) return { kind: "none" };

    const prev = stateRef.current;

    // Determine the authoritative status from the event action.
    const authoritativeStatus: PlaybackStatus =
      event.action === "play"
        ? "playing"
        : event.action === "pause"
          ? "paused"
          : prev.status;

    // Calculate expected time from authoritative state.
    const expectedTime =
      event.action === "seek"
        ? event.currentTime
        : calculateExpectedTime(
            event.currentTime,
            authoritativeStatus,
            event.playbackRate,
            new Date(event.sentAt).toISOString(),
          );

    const drift = expectedTime - prev.currentTime;

    // EXPLICIT SEEK EVENT: Apply immediately regardless of drift threshold.
    if (event.action === "seek") {
      return { kind: "seek", targetTime: event.currentTime };
    }

    // SMALL_DRIFT (0–0.5s): Ignore. Do not seek.
    if (Math.abs(drift) <= DRIFT_THRESHOLD_SMALL) {
      return { kind: "none" };
    }

    // MEDIUM_DRIFT (0.5s < drift ≤ 1.5s): Rate-correct if player supports it.
    // The player adapter can apply temporary playback-rate correction.
    if (Math.abs(drift) <= DRIFT_THRESHOLD_MEDIUM) {
      return { kind: "rate-correct", targetRate: event.playbackRate };
    }

    // LARGE_DRIFT (>1.5s): Seek to expected time.
    return { kind: "seek", targetTime: expectedTime };
  }, []);

  return {
    play,
    pause,
    seek,
    getCurrentTime: () => stateRef.current.currentTime,
    getPlaybackRate: () => stateRef.current.playbackRate,
    setPlaybackRate,
    getState: () => {
      const s = stateRef.current;
      return { status: s.status, currentTime: s.currentTime, playbackRate: s.playbackRate };
    },
    onStateChange: (callback: (s: PlaybackState) => void) => {
      // The caller-supplied `onRemoteUpdate` prop is invoked on every applied
      // remote update (see the broadcast handler). This registration hook is
      // provided for parity with the PlaybackController interface; the live
      // callback is captured via the prop.
      remoteUpdateRef.current = callback;
      return () => {
        if (remoteUpdateRef.current === callback) remoteUpdateRef.current = undefined;
      };
    },
    getDriftCorrection,
    syncPhase,
  };
}

export type { PlaybackEvent, PlaybackState, PlaybackController, SyncPhase, DriftCorrection };