-- المرحلة 5: مراجعة الإعلانات الجديدة قبل ظهورها
-- شغّله بعد phase4.sql: Supabase > SQL Editor > New query > Run

alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('pending', 'active', 'hidden', 'blocked'));

create index if not exists listings_pending_idx on public.listings (created_at) where status = 'pending';
