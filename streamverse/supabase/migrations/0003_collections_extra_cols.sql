-- Collections schema extensions for Custom Collections feature.
-- Adds description, cover image, and added_at timestamp to support
-- the full requirements without touching the existing RLS policies
-- in 0002_rls.sql (they use `for all` / `*` selects which cover new columns).

alter table public.collections
  add column if not exists description text,
  add column if not exists cover_image_url text;

alter table public.collection_items
  add column if not exists added_at timestamptz not null default now();

-- Fast per-user listing ordered by newest first.
create index if not exists collections_user_idx
  on public.collections (user_id, created_at desc);

-- Fast per-collection item listing ordered by insertion time.
create index if not exists collection_items_coll_idx
  on public.collection_items (collection_id, added_at desc);
