"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getCollectionsForUser,
  getCollectionWithItems,
  createCollection as createCollectionInDb,
  updateCollection as updateCollectionInDb,
  deleteCollection as deleteCollectionInDb,
  addItemToCollection,
  removeItemFromCollection,
  reorderCollectionItems,
  toggleCollectionItem,
  getCollectionMembershipsForMedia,
} from "@/lib/collections";

import type { Collection } from "@/types/collection";

// ---------------------------------------------------------------------------
// SHARED HELPERS
// ---------------------------------------------------------------------------

interface ActionFailure {
  ok: false;
  error: "unauthenticated" | "unconfigured" | "failed" | "not_found";
}

interface ActionSuccess<T = undefined> {
  ok: true;
  data: T;
}

type ActionResult<T = undefined> = ActionFailure | ActionSuccess<T>;

function unauthenticated(): ActionFailure {
  return { ok: false, error: "unauthenticated" };
}

function unconfigured(): ActionFailure {
  return { ok: false, error: "unconfigured" };
}

function failed(): ActionFailure {
  return { ok: false, error: "failed" };
}

async function requireAuth(): Promise<{ ok: true; userId: string } | ActionFailure> {
  if (!isSupabaseConfigured()) return unconfigured();
  const user = await getCurrentUser();
  if (!user) return unauthenticated();
  return { ok: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// COLLECTIONS
// ---------------------------------------------------------------------------

export async function getCollectionsAction(): Promise<
  ActionSuccess<Collection[]> | ActionFailure
> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const collections = await getCollectionsForUser();
    return { ok: true, data: collections };
  } catch {
    return failed();
  }
}

export async function getCollectionDetailAction(id: string): Promise<
  ActionSuccess<Awaited<ReturnType<typeof getCollectionWithItems>>> | ActionFailure
> {
  if (!isSupabaseConfigured()) return unconfigured();

  try {
    const data = await getCollectionWithItems(id);
    if (!data) return { ok: false, error: "not_found" };
    return { ok: true, data };
  } catch {
    return failed();
  }
}

export async function createCollectionAction(input: {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isPublic?: boolean;
}): Promise<ActionSuccess<Collection | null> | ActionFailure> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.name?.trim()) return failed();

  try {
    const result = await createCollectionInDb(input);
    if (!result) return failed();
    revalidatePath("/collections");
    return { ok: true, data: result };
  } catch {
    return failed();
  }
}

export async function updateCollectionAction(input: {
  collectionId: string;
  name?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isPublic?: boolean;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.collectionId) return failed();

  try {
    const result = await updateCollectionInDb(input.collectionId, input);
    if (!result) return failed();
    revalidatePath("/collections");
    revalidatePath(`/collections/${input.collectionId}`);
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function deleteCollectionAction(input: {
  collectionId: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.collectionId) return failed();

  try {
    const result = await deleteCollectionInDb(input.collectionId);
    if (!result) return failed();
    revalidatePath("/collections");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

// ---------------------------------------------------------------------------
// ITEMS
// ---------------------------------------------------------------------------

export async function addItemToCollectionAction(input: {
  collectionId: string;
  mediaType: string;
  mediaId: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.collectionId || !input?.mediaType || !input?.mediaId) return failed();

  try {
    const ok = await addItemToCollection(input);
    if (!ok) return failed();
    revalidatePath(`/collections/${input.collectionId}`);
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function removeItemFromCollectionAction(input: {
  collectionId: string;
  mediaType: string;
  mediaId: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.collectionId || !input?.mediaType || !input?.mediaId) return failed();

  try {
    const items = await getCollectionWithItems(input.collectionId);
    if (!items) return { ok: false, error: "not_found" };
    const item = items.items.find(
      (i) => i.mediaType === input.mediaType && i.mediaId === input.mediaId,
    );
    if (!item) return { ok: false, error: "not_found" };

    const ok = await removeItemFromCollection(item.id);
    if (!ok) return failed();
    revalidatePath(`/collections/${input.collectionId}`);
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function reorderItemsAction(input: {
  collectionId: string;
  itemIds: string[];
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.collectionId || !input?.itemIds?.length) return failed();

  try {
    const ok = await reorderCollectionItems(input.collectionId, input.itemIds);
    if (!ok) return failed();
    revalidatePath(`/collections/${input.collectionId}`);
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function toggleCollectionItemAction(input: {
  collectionId: string;
  mediaType: string;
  mediaId: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.collectionId || !input?.mediaType || !input?.mediaId) return failed();

  try {
    const ok = await toggleCollectionItem(input);
    if (!ok) return failed();
    revalidatePath(`/collections/${input.collectionId}`);
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function getMembershipsAction(input: {
  mediaType: string;
  mediaId: string;
}): Promise<
  ActionSuccess<Awaited<ReturnType<typeof getCollectionMembershipsForMedia>>> | ActionFailure
> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const data = await getCollectionMembershipsForMedia(input.mediaType, input.mediaId);
    return { ok: true, data };
  } catch {
    return failed();
  }
}
