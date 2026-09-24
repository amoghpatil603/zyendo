"use client";

import { useEffect, useRef } from "react";

import type {
  PlaybackController,
  PlaybackState,
  PlaybackStatus,
  DriftCorrection,
} from "@/types/watch-together";

export interface Html5VideoAdapterOptions {
  /** A legitimate media source URL supplied by a future provider. */
  mediaUrl: string;
  /** Called whenever the underlying element emits a native playback event. */
  onStateChange?: (state: PlaybackState) => void;
  /**
   * Optional external authority. When provided, only events coming from this
   * controller's own host broadcasts mutate local playback; in a real room the
   * host is the only writer and guests only apply remote state.
   */
  initial?: Pick<PlaybackState, "status" | "currentTime" | "playbackRate">;
}

/**
 * Architecture-validation adapter: bridges a native HTML5 `<video>` element to
 * the `PlaybackController` interface used by the WT-3 synchronization layer.
 *
 * It intentionally takes its media URL as an explicit parameter and never
 * hardcodes any demo/fake content. It is NOT wired into the production Watch
 * Together flow; it exists to prove the integration seam works against a real,
 * controllable media element.
 */
export function createHtml5VideoAdapter(
  element: HTMLVideoElement,
  options: Html5VideoAdapterOptions,
): PlaybackController {
  const { mediaUrl, onStateChange, initial } = options;
  const listeners = new Set<(state: PlaybackState) => void>();

  useEffect(() => {
    element.src = mediaUrl;
    if (initial) {
      element.currentTime = initial.currentTime;
      element.playbackRate = initial.playbackRate;
      if (initial.status === "playing") void element.play().catch(() => {});
    }
    const emit = () => {
      const state: PlaybackState = {
        sessionId: "",
        status: element.paused ? "paused" : "playing",
        currentTime: element.currentTime,
        playbackRate: element.playbackRate,
        updatedAt: new Date().toISOString(),
        sequence: 0,
      };
      onStateChange?.(state);
      listeners.forEach((cb) => cb(state));
    };
    element.addEventListener("play", emit);
    element.addEventListener("pause", emit);
    element.addEventListener("seeked", emit);
    element.addEventListener("ratechange", emit);
    return () => {
      element.removeEventListener("play", emit);
      element.removeEventListener("pause", emit);
      element.removeEventListener("seeked", emit);
      element.removeEventListener("ratechange", emit);
    };
  }, [element, mediaUrl, onStateChange, initial]);

  return {
    play: () => void element.play().catch(() => {}),
    pause: () => element.pause(),
    seek: (time: number) => {
      element.currentTime = time;
    },
    getCurrentTime: () => element.currentTime,
    getPlaybackRate: () => element.playbackRate,
    setPlaybackRate: (rate: number) => {
      element.playbackRate = rate;
    },
    getState: (): { status: PlaybackStatus; currentTime: number; playbackRate: number } => ({
      status: element.paused ? "paused" : "playing",
      currentTime: element.currentTime,
      playbackRate: element.playbackRate,
    }),
    onStateChange: (callback: (state: PlaybackState) => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    // Player adapter: no drift correction needed (handled by usePlaybackController).
    getDriftCorrection: (): DriftCorrection => ({ kind: "none" }),
  };
}

/** React hook returning a ref to attach to a `<video>` element. */
export function useHtml5VideoAdapter(
  mediaUrl: string,
  onStateChange?: (state: PlaybackState) => void,
): React.RefObject<HTMLVideoElement | null> {
  const ref = useRef<HTMLVideoElement>(null);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    element.src = mediaUrl;
    const emit = () => {
      const state: PlaybackState = {
        sessionId: "",
        status: element.paused ? "paused" : "playing",
        currentTime: element.currentTime,
        playbackRate: element.playbackRate,
        updatedAt: new Date().toISOString(),
        sequence: 0,
      };
      onStateChangeRef.current?.(state);
    };
    element.addEventListener("play", emit);
    element.addEventListener("pause", emit);
    element.addEventListener("seeked", emit);
    element.addEventListener("ratechange", emit);
    return () => {
      element.removeEventListener("play", emit);
      element.removeEventListener("pause", emit);
      element.removeEventListener("seeked", emit);
      element.removeEventListener("ratechange", emit);
    };
  }, [mediaUrl]);

  return ref;
}
