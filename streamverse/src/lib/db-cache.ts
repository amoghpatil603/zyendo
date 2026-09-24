import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv, isSupabaseConfigured } from "@/lib/env";
import type { MediaDetail } from "@/types/media-item";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (!isSupabaseConfigured() || !serverEnv.supabaseServiceRoleKey) return null;
  if (!adminClient) {
    adminClient = createClient(publicEnv.supabaseUrl!, serverEnv.supabaseServiceRoleKey);
  }
  return adminClient;
}

export async function getCachedMediaDetail(id: string, ttlSeconds = 2592000): Promise<MediaDetail | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("media_items")
      .select("normalized_data, ai_metadata, updated_at")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    
    // Check TTL (default 30 days)
    const updated = new Date((data as any).updated_at).getTime();
    const now = Date.now();
    if (now - updated > ttlSeconds * 1000) return null;

    const detail = (data as any).normalized_data as MediaDetail;
    detail.aiMetadata = (data as any).ai_metadata;
    return detail;
  } catch {
    return null;
  }
}

export async function setCachedMediaDetail(id: string, mediaType: string, detail: MediaDetail): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) return;
  try {
    await supabase.from("media_items").upsert({
      id,
      media_type: mediaType,
      normalized_data: detail as any,
      updated_at: new Date().toISOString()
    } as any);
  } catch (err) {
    console.error("[DB-CACHE] Failed to cache media detail", err);
  }
}

export async function setAiMetadata(id: string, aiMetadata: any): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) return;
  try {
    // Try to update existing record, if it fails because it doesn't exist, we don't care (since basic cache will upsert later)
    await (supabase.from("media_items") as any)
      .update({ ai_metadata: aiMetadata })
      .eq("id", id);
  } catch (err) {
    console.error("[DB-CACHE] Failed to save AI metadata", err);
  }
}

export async function getLocalPoolForRecommendations(limit = 60): Promise<MediaDetail[]> {
  const supabase = getAdminClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("media_items")
      .select("normalized_data, ai_metadata")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((d: any) => {
      const detail = d.normalized_data as MediaDetail;
      detail.aiMetadata = d.ai_metadata;
      return detail;
    });
  } catch {
    return [];
  }
}

export async function getCachedList<T = any>(queryKey: string, ttlSeconds = 86400): Promise<T | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("search_cache")
      .select("results, updated_at")
      .eq("query_key", queryKey)
      .single();
    if (error || !data) return null;

    // Check TTL (default 24 hours)
    const updated = new Date((data as any).updated_at).getTime();
    const now = Date.now();
    if (now - updated > ttlSeconds * 1000) return null;

    return (data as any).results as T;
  } catch {
    return null;
  }
}

export async function setCachedList<T = any>(queryKey: string, results: T): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) return;
  try {
    await supabase.from("search_cache").upsert({
      query_key: queryKey,
      results: results as any,
      updated_at: new Date().toISOString()
    } as any);
  } catch (err) {
    console.error("[DB-CACHE] Failed to cache list", err);
  }
}
