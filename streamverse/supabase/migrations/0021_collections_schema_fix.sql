-- Collections schema completeness fix.
-- Ensures all columns referenced by the application exist, even if earlier
-- migrations were not applied in order.

alter table public.collections
  add column if not exists display_order int not null default 0;

alter table public.collection_items
  add column if not exists sort_order int not null default 0,
  add column if not exists added_at timestamptz not null default now();

-- Prevent duplicate items within the same collection.
create unique index if not exists collection_items_unique
  on public.collection_items (collection_id, media_type, media_id);
