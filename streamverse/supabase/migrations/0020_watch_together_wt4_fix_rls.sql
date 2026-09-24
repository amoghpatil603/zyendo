-- WT-4: Allow original suggester to delete their own queue items.
-- The server action removeFromSharedQueueAction allows:
--   A. host (any item)
--   B. original suggester (own item)
--
-- The existing wsq_host_delete policy (migration 0019) only covers case A.
-- This migration adds coverage for case B.

-- Suggester can delete their own queue item
create policy "wsq_suggester_delete"
  on public.watch_session_queue
  for delete
  using (
    suggested_by_user_id = auth.uid()
    and exists (
      select 1 from public.watch_session_participants p
      where p.session_id = watch_session_queue.session_id
        and p.user_id = auth.uid()
    )
  );