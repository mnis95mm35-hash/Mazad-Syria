-- المرحلة 6 (اختيارية): تسريع البحث النصي عند كثرة الإعلانات.
-- آمنة للتشغيل في أي وقت ومرات متعددة. شغّلها من Supabase → SQL Editor.
create extension if not exists pg_trgm;

create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);

create index if not exists listings_description_trgm_idx
  on public.listings using gin (description gin_trgm_ops);
