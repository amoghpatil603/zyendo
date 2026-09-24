"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  addToWatchQueue,
  getWatchQueue,
  getWatchQueueStats,
  removeFromWatchQueue,
  toggleFavorite,
  updateWatchQueueNotes,
  updateWatchQueuePriority,
  updateWatchQueueRating,
  updateWatchQueueStatus,
  type WatchQueueItem,
  type WatchQueuePriority,
  type WatchQueueStats,
  type WatchQueueStatus,
} from "@/lib/watch-queue-data";

export interface WatchQueueActionFailure {
  ok: false;
  error: "unauthenticated" | "unconfigured" | "failed";
}
export interface WatchQueueActionSuccess<T = undefined> {
  ok: true;
  data: T;
}
export type WatchQueueActionResult<T = undefined> =
  | WatchQueueActionFailure
  | WatchQueueActionSuccess<T>;

function requireAuthError(): WatchQueueActionFailure {
  return { ok: false, error: "unauthenticated" };
}

function requireConfiguredError(): WatchQueueActionFailure {
  return { ok: false, error: "unconfigured" };
}

function failed(): WatchQueueActionFailure {
  return { ok: false, error: "failed" };
}

async function assertUser(): Promise<{ ok: true; userId: string } | WatchQueueActionFailure> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const user = await getCurrentUser();
  if (!user) return requireAuthError();
  return { ok: true, userId: user.id };
}

export async function getWatchQueueAction(): Promise<{
  ok: true;
  items: WatchQueueItem[];
  stats: WatchQueueStats;
} | WatchQueueActionFailure> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  try {
    const [items, stats] = await Promise.all([
      getWatchQueue(auth.userId),
      getWatchQueueStats(),
    ]);
    return { ok: true, items, stats };
  } catch {
    return failed();
  }
}

export async function getWatchQueueStatsAction(): Promise<{
  ok: true;
  stats: WatchQueueStats;
} | WatchQueueActionFailure> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  try {
    const stats = await getWatchQueueStats();
    return { ok: true, stats };
  } catch {
    return failed();
  }
}

export async function addToWatchQueueAction(input: {
  tmdbId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  releaseDate?: string | null;
}): Promise<WatchQueueActionResult> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  if (!input?.tmdbId || !input?.title || !input?.mediaType) return failed();

  try {
    const ok = await addToWatchQueue({
      tmdbId: input.tmdbId,
      mediaType: input.mediaType,
      title: input.title,
      posterPath: input.posterPath ?? null,
      releaseDate: input.releaseDate ?? null,
    });
    if (!ok) return failed();
    revalidatePath("/watch-queue");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function updateWatchQueueStatusAction(input: {
  id: string;
  status: WatchQueueStatus;
}): Promise<WatchQueueActionResult> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  if (!input?.id || !input?.status) return failed();

  try {
    const ok = await updateWatchQueueStatus({ id: input.id, status: input.status });
    if (!ok) return failed();
    revalidatePath("/watch-queue");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function updateWatchQueuePriorityAction(input: {
  id: string;
  priority: WatchQueuePriority;
}): Promise<WatchQueueActionResult> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  if (!input?.id || !input?.priority) return failed();

  try {
    const ok = await updateWatchQueuePriority({
      id: input.id,
      priority: input.priority,
    });
    if (!ok) return failed();
    revalidatePath("/watch-queue");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function updateWatchQueueRatingAction(input: {
  id: string;
  rating: number | null;
}): Promise<WatchQueueActionResult> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  if (!input?.id) return failed();

  const rating = input.rating === null ? null : Math.max(0, Math.min(10, input.rating));

  try {
    const ok = await updateWatchQueueRating({ id: input.id, rating });
    if (!ok) return failed();
    revalidatePath("/watch-queue");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function updateWatchQueueNotesAction(input: {
  id: string;
  notes: string | null;
}): Promise<WatchQueueActionResult> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  if (!input?.id) return failed();

  try {
    const ok = await updateWatchQueueNotes({ id: input.id, notes: input.notes });
    if (!ok) return failed();
    revalidatePath("/watch-queue");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function toggleFavoriteAction(input: {
  id: string;
}): Promise<WatchQueueActionResult<{ favorite: boolean }>> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  if (!input?.id) return failed();

  try {
    const ok = await toggleFavorite({ id: input.id });
    if (!ok) return failed();
    revalidatePath("/watch-queue");
    return { ok: true, data: { favorite: true } };
  } catch {
    return failed();
  }
}

export async function removeFromWatchQueueAction(input: {
  id: string;
}): Promise<WatchQueueActionResult> {
  if (!isSupabaseConfigured()) return requireConfiguredError();
  const auth = await assertUser();
  if (!auth.ok) return auth;

  if (!input?.id) return failed();

  try {
    const ok = await removeFromWatchQueue(input.id);
    if (!ok) return failed();
    revalidatePath("/watch-queue");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

