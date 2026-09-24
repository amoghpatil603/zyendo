"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MemoryType, UserMemory, UserMemoryRow } from "@/types/user-memory";

export type UserMemoryActionResult =
  | { ok: true; memory: UserMemory }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "failed" | "invalid_type" };

export type UserMemoryListResult =
  | { ok: true; memories: UserMemory[] }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "failed" };

const VALID_TYPES: MemoryType[] = [
  "preference",
  "exclusion",
  "constraint",
  "context",
];

const memoryIdSchema = z.string().uuid();
const memoryStatementSchema = z.string().trim().min(1).max(500);

function mapRow(row: UserMemoryRow): UserMemory {
  return {
    id: row.id,
    userId: row.user_id,
    statement: row.statement,
    type: row.type,
    active: row.active,
    createdAt: row.created_at,
  };
}

/** Create a new user memory. */
export async function createUserMemory(
  statement: string,
  type: MemoryType,
): Promise<UserMemoryActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };
  if (!VALID_TYPES.includes(type)) return { ok: false, error: "invalid_type" };
  const parsedStatement = memoryStatementSchema.safeParse(statement);
  if (!parsedStatement.success) return { ok: false, error: "failed" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_memory")
    .insert({
      user_id: user.id,
      statement: parsedStatement.data,
      type,
      active: true,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "failed" };

  revalidatePath("/memory");
  return { ok: true, memory: mapRow(data as UserMemoryRow) };
}

/** Update a user memory's statement, type, or active flag. */
export async function updateUserMemory(
  id: string,
  updates: { statement?: string; type?: MemoryType; active?: boolean },
): Promise<UserMemoryActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };
  if (!memoryIdSchema.safeParse(id).success) return { ok: false, error: "failed" };
  if (updates.type && !VALID_TYPES.includes(updates.type)) {
    return { ok: false, error: "invalid_type" };
  }
  const parsedStatement = updates.statement === undefined
    ? undefined
    : memoryStatementSchema.safeParse(updates.statement);
  if (parsedStatement && !parsedStatement.success) {
    return { ok: false, error: "failed" };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const patch: Record<string, unknown> = {};
  if (parsedStatement?.success) patch.statement = parsedStatement.data;
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.active !== undefined) patch.active = updates.active;
  if (Object.keys(patch).length === 0) return { ok: false, error: "failed" };

  const { data, error } = await supabase
    .from("user_memory")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "failed" };

  revalidatePath("/memory");
  return { ok: true, memory: mapRow(data as UserMemoryRow) };
}

/** Delete a user memory owned by the current user. */
export async function deleteUserMemory(id: string): Promise<UserMemoryActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };
  if (!memoryIdSchema.safeParse(id).success) return { ok: false, error: "failed" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("user_memory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "failed" };

  revalidatePath("/memory");
  return {
    ok: true,
    memory: {
      id,
      userId: user.id,
      statement: "",
      type: "context",
      active: false,
      createdAt: new Date().toISOString(),
    },
  };
}

/** List all user memories for the current user, including inactive entries. */
export async function listUserMemories(): Promise<UserMemoryListResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return { ok: false, error: "failed" };

  return { ok: true, memories: (data as UserMemoryRow[]).map(mapRow) };
}
