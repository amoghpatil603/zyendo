-- Social Platform V2-1

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Review likes
CREATE TABLE IF NOT EXISTS public.review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review likes"
  ON public.review_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like reviews"
  ON public.review_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.review_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Collection likes
CREATE TABLE IF NOT EXISTS public.collection_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, user_id)
);

ALTER TABLE public.collection_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read collection likes"
  ON public.collection_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like collections"
  ON public.collection_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike collections"
  ON public.collection_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Comments on reviews
CREATE TABLE IF NOT EXISTS public.review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_id uuid REFERENCES public.review_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.review_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.review_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit own comments"
  ON public.review_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.review_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Social activity feed (cross-user activity)
CREATE OR REPLACE VIEW public.social_activity AS
SELECT
  ua.id,
  ua.user_id,
  ua.activity_type,
  ua.media_type,
  ua.media_id,
  ua.metadata,
  ua.created_at,
  p.display_name,
  p.avatar_url,
  p.public_slug
FROM public.user_activity ua
JOIN public.profiles p ON p.id = ua.user_id
WHERE p.status IS DISTINCT FROM 'suspended'
ORDER BY ua.created_at DESC;

-- User search view
CREATE OR REPLACE VIEW public.user_search AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  p.public_slug,
  p.created_at,
  COALESCE(uc.collection_count, 0) AS collection_count,
  COALESCE(ur.review_count, 0) AS review_count,
  COALESCE(uf.follower_count, 0) AS follower_count
FROM public.profiles p
LEFT JOIN (SELECT user_id, COUNT(*) AS collection_count FROM public.collections GROUP BY user_id) uc ON uc.user_id = p.id
LEFT JOIN (SELECT user_id, COUNT(*) AS review_count FROM public.reviews GROUP BY user_id) ur ON ur.user_id = p.id
LEFT JOIN (SELECT following_id, COUNT(*) AS follower_count FROM public.follows GROUP BY following_id) uf ON uf.following_id = p.id
WHERE p.status IS DISTINCT FROM 'suspended';

-- Indexes
CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS review_likes_review_idx ON public.review_likes (review_id);
CREATE INDEX IF NOT EXISTS review_likes_user_idx ON public.review_likes (user_id);
CREATE INDEX IF NOT EXISTS collection_likes_collection_idx ON public.collection_likes (collection_id);
CREATE INDEX IF NOT EXISTS collection_likes_user_idx ON public.collection_likes (user_id);
CREATE INDEX IF NOT EXISTS review_comments_review_idx ON public.review_comments (review_id);
CREATE INDEX IF NOT EXISTS review_comments_user_idx ON public.review_comments (user_id);
