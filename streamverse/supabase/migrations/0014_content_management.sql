-- Content Management System for admin platform

-- Hero banners for homepage carousel
CREATE TABLE IF NOT EXISTS public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  media_type text, -- 'movie', 'tv', 'anime', or null for custom
  media_id text,
  backdrop_url text,
  overlay_color text DEFAULT 'rgba(0,0,0,0.5)',
  cta_label text DEFAULT 'Watch Now',
  cta_href text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  scheduled_from timestamptz,
  scheduled_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hero banners"
  ON public.hero_banners FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')));

-- Featured content (pinned movies, TV, anime)
CREATE TABLE IF NOT EXISTS public.featured_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type text NOT NULL CHECK (media_type IN ('movie', 'tv', 'anime')),
  media_id text NOT NULL,
  label text, -- 'editor_pick', 'trending', 'new', 'exclusive', 'coming_soon'
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_type, media_id)
);

ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage featured content"
  ON public.featured_content FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')));

-- Editorial collections (curated lists like "Top Horror Movies")
CREATE TABLE IF NOT EXISTS public.editorial_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover_image_url text,
  media_type text, -- 'movie', 'tv', 'anime', or null for mixed
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage editorial collections"
  ON public.editorial_collections FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')));

-- Editorial collection items
CREATE TABLE IF NOT EXISTS public.editorial_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.editorial_collections(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'tv', 'anime')),
  media_id text NOT NULL,
  note text,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (collection_id, media_type, media_id)
);

ALTER TABLE public.editorial_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage editorial collection items"
  ON public.editorial_collection_items FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')));

-- Homepage section visibility toggles
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage homepage sections"
  ON public.homepage_sections FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')));

-- Seed homepage sections
INSERT INTO public.homepage_sections (section_key, label, sort_order) VALUES
  ('trending', 'Trending', 1),
  ('continue_watching', 'Continue Watching', 2),
  ('ai_picks', 'AI Picks', 3),
  ('collections', 'Collections', 4),
  ('hidden_gems', 'Hidden Gems', 5),
  ('upcoming', 'Upcoming Releases', 6),
  ('watch_together', 'Watch Together', 7),
  ('reviews', 'Recent Reviews', 8)
ON CONFLICT (section_key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS hero_banners_active_idx ON public.hero_banners (is_active, sort_order);
CREATE INDEX IF NOT EXISTS featured_content_active_idx ON public.featured_content (is_active, sort_order);
CREATE INDEX IF NOT EXISTS editorial_collections_published_idx ON public.editorial_collections (is_published, sort_order);
