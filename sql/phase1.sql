-- المرحلة 1: حالة الإعلان وانتهاؤه + جدول الحد من الإغراق
-- شغّله مرة واحدة من Supabase > SQL Editor > New query > Run

alter table public.listings
  add column if not exists status text not null default 'active',
  add column if not exists expires_at timestamptz not null default (now() + interval '60 days');

alter table public.listings
  add constraint listings_status_check check (status in ('active', 'hidden'));

create index if not exists listings_active_idx
  on public.listings (status, expires_at, created_at desc);
create index if not exists listings_featured_idx
  on public.listings (is_featured, featured_until) where is_featured;

create table if not exists public.rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_key_idx
  on public.rate_events (key, created_at desc);

alter table public.rate_events enable row level security;
revoke all on table public.rate_events from anon, authenticated;
