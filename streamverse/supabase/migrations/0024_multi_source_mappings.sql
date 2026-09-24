-- 0024_multi_source_mappings.sql
-- Store external provider mappings to ensure unique entity resolution
-- across different sources (Zynora, TMDB, IMDb, MAL).

CREATE TABLE IF NOT EXISTS public.media_mappings (
  zynora_id text PRIMARY KEY REFERENCES public.media_items(id) ON DELETE CASCADE,
  tmdb_id text,
  imdb_id text,
  mal_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_mappings_tmdb ON public.media_mappings(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_media_mappings_imdb ON public.media_mappings(imdb_id);
CREATE INDEX IF NOT EXISTS idx_media_mappings_mal ON public.media_mappings(mal_id);

-- Secure table for storing connected 3rd party accounts (e.g. MyAnimeList OAuth)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('myanimelist')),
  provider_account_id text NOT NULL,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider),
  UNIQUE (provider, provider_account_id)
);

-- RLS
ALTER TABLE public.media_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to media_mappings" ON public.media_mappings FOR SELECT USING (true);
-- Server role manages inserts

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own connected accounts" ON public.connected_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own connected accounts" ON public.connected_accounts FOR DELETE USING (auth.uid() = user_id);
-- Insert/Update handled by service role during OAuth flow
