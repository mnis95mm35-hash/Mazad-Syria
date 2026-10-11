-- المرحلة 3 (ب): المدينة أو البلدة أو المنطقة داخل المحافظة
-- شغّله بعد phase3.sql: Supabase > SQL Editor > New query > Run

alter table public.listings add column if not exists area text;

create index if not exists listings_city_area_idx
  on public.listings (city, area)
  where status = 'active';
