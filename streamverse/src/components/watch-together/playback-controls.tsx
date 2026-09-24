"use client";

import { useState } from "react";
import { Pause, Play, Radio, Wifi, WifiOff, AlertTriangle } from "lucide-react";

import type { PlaybackController, SyncPhase } from "@/types/watch-together";
import { Button } from "@/components/ui/button";

const SYNC_LABEL: Record<SyncPhase, string> = {
  idle: "Not connected",
  connecting: "Syncing…",
  reconnecting: "Reconnecting…",
  synced: "In sync",
  "out-of-sync": "Correcting drift…",
  error: "Sync unavailable",
};

export function SyncStatus({ phase }: { phase: SyncPhase }) {
  const Icon =
    phase === "synced"
      ? Wifi
      : phase === "error" || phase === "idle"
        ? WifiOff
        : phase === "out-of-sync"
          ? AlertTriangle
          : Radio;
  const tone =
    phase === "synced"
      ? "bg-green-500/15 text-green-500"
      : phase === "out-of-sync"
        ? "bg-amber-500/15 text-amber-500"
        : phase === "error"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      <Icon className="size-3" />
      {SYNC_LABEL[phase]}
    </span>
  );
}

export function PlaybackControls({
  controller,
  isHost,
}: {
  controller: PlaybackController & { syncPhase: SyncPhase };
  isHost: boolean;
}) {
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const state = controller.getState();
  const current = scrubbing ? scrubValue : state.currentTime;

  function format(t: number) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!isHost) {
    // Non-hosts see read-only status + sync indicator.
    return (
      <div className="glass flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
        <div className="flex items-center gap-2 text-sm">
          {state.status === "playing" ? (
            <Play className="size-4 text-primary" />
          ) : (
            <Pause className="size-4 text-muted-foreground" />
          )}
          <span className="tabular-nums">{format(current)}</span>
          <span className="text-xs text-muted-foreground">
            {state.status === "playing" ? "Playing" : "Paused"} · {state.playbackRate}×
          </span>
        </div>
        <SyncStatus phase={controller.syncPhase} />
      </div>
    );
  }

  return (
    <div className="glass space-y-3 rounded-xl border border-border/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant={state.status === "playing" ? "default" : "secondary"}
            aria-label={state.status === "playing" ? "Pause" : "Play"}
            onClick={() => (state.status === "playing" ? controller.pause() : controller.play())}
          >
            {state.status === "playing" ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <span className="text-sm tabular-nums">{format(current)}</span>
        </div>
        <SyncStatus phase={controller.syncPhase} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary">
          <Play className="size-3" />
          Controlled by Host
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(3600, Math.floor(current) + 600)}
        step={1}
        value={current}
        onChange={(e) => {
          setScrubbing(true);
          setScrubValue(Number(e.target.value));
        }}
        onMouseUp={(e) => {
          controller.seek(Number((e.target as HTMLInputElement).value));
          setScrubbing(false);
        }}
        onTouchEnd={(e) => {
          controller.seek(Number((e.target as HTMLInputElement).value));
          setScrubbing(false);
        }}
        className="w-full accent-primary"
        aria-label="Seek"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Host controls playback for everyone</span>
        <div className="flex gap-1">
          {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => controller.setPlaybackRate(rate)}
              className={`rounded-md px-1.5 py-0.5 ${
                Math.abs(state.playbackRate - rate) < 0.01
                  ? "bg-primary/15 text-primary"
                  : "hover:text-foreground"
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
