-- Migration: 0022_self_growing_db
-- Description: Create tables for persistent caching of normalized TMDB data to reduce API calls.

-- 1. media_items: Stores individual MediaDetail objects
CREATE TABLE IF NOT EXISTS public.media_items (
    id TEXT PRIMARY KEY,
    media_type TEXT NOT NULL,
    normalized_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Service role will bypass for writes)
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to media_items" 
    ON public.media_items 
    FOR SELECT 
    USING (true);

-- 2. search_cache: Stores paginated MediaItem arrays for searches and trending lists
CREATE TABLE IF NOT EXISTS public.search_cache (
    query_key TEXT PRIMARY KEY,
    results JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to search_cache" 
    ON public.search_cache 
    FOR SELECT 
    USING (true);
