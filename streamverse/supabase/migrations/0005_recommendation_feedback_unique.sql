-- One current reaction per user, title, and recommendation surface.
create unique index if not exists recommendation_feedback_user_media_source_key
  on public.recommendation_feedback (user_id, media_type, media_id, source);
