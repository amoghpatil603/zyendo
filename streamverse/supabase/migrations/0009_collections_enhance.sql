-- StreamVerse Collections Enhancement
-- Adds sort_order for drag & drop, and indexes for performance.

-- Add sort_order to collection_items for drag & drop reordering
alter table public.collection_items
  add column if not exists sort_order int not null default 0;

-- Add display_order to collections for custom ordering on the list page
alter table public.collections
  add column if not exists display_order int not null default 0;

-- Index for sort order queries
create index if not exists collection_items_sort_idx
  on public.collection_items (collection_id, sort_order);

-- Index for collections display order
create index if not exists collections_display_order_idx
  on public.collections (user_id, display_order, created_at desc);