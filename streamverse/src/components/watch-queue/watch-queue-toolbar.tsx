"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { WatchQueuePriority, WatchQueueStatus } from "@/lib/watch-queue-data";

export type WatchQueueFilterStatus = WatchQueueStatus | "all";
export type WatchQueueFilterPriority = WatchQueuePriority | "all";

export type WatchQueueSortKey =
  | "added_desc"
  | "added_asc"
  | "title_asc"
  | "title_desc"
  | "priority_desc"
  | "priority_asc";

export type WatchQueueToolbarState = {
  query: string;
  status: WatchQueueFilterStatus;
  priority: WatchQueueFilterPriority;
  sortKey: WatchQueueSortKey;
  favoritesOnly: boolean;
};

export const DEFAULT_WATCH_QUEUE_TOOLBAR_STATE: WatchQueueToolbarState = {
  query: "",
  status: "all",
  priority: "all",
  sortKey: "added_desc",
  favoritesOnly: false,
};

export default function WatchQueueToolbar(props: {
  state: WatchQueueToolbarState;
  statsBadge?: React.ReactNode;
  onChange: (next: WatchQueueToolbarState) => void;
  onReset: () => void;
  isPending?: boolean;
}) {
  const { state } = props;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:max-w-md">
          <label className="text-sm font-medium">Search</label>
          <Input
            value={state.query}
            placeholder="Title or TMDB ID"
            onChange={(e) => props.onChange({ ...state, query: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          {props.statsBadge}
          <Button type="button" variant="secondary" onClick={props.onReset} disabled={props.isPending}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={state.status} onValueChange={(v) => props.onChange({ ...state, status: v as any })}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="watching">Watching</SelectItem>
              <SelectItem value="watched">Watched</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <Select
            value={state.priority}
            onValueChange={(v) => props.onChange({ ...state, priority: v as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Sort</label>
          <Select value={state.sortKey} onValueChange={(v) => props.onChange({ ...state, sortKey: v as WatchQueueSortKey })}>
            <SelectTrigger>
              <SelectValue placeholder="Newest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="added_desc">Newest</SelectItem>
              <SelectItem value="added_asc">Oldest</SelectItem>
              <SelectItem value="title_asc">Title A→Z</SelectItem>
              <SelectItem value="title_desc">Title Z→A</SelectItem>
              <SelectItem value="priority_desc">Priority (High→Low)</SelectItem>
              <SelectItem value="priority_asc">Priority (Low→High)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.favoritesOnly}
            onChange={(e) => props.onChange({ ...state, favoritesOnly: e.target.checked })}
          />
          Favorites only
        </label>
        <Badge variant="secondary">Total: {"—"}</Badge>
      </div>
    </div>
  );
}

