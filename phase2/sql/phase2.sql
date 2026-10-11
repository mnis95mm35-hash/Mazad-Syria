-- المرحلة 2: حسابات المستخدمين، الإبلاغ، وطلبات التمييز
-- شغّله بعد phase1.sql: Supabase > SQL Editor > New query > Run

-- حالات الإعلان: active فعّال، hidden أخفاه صاحبه، blocked حظرته الإدارة (أو بلاغات كثيرة)
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('active', 'hidden', 'blocked'));

-- مالك الإعلان (الإعلانات القديمة بلا مالك)
alter table public.listings
  add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists listings_user_idx on public.listings (user_id);

-- البلاغات: بلاغ واحد لكل زائر على كل إعلان
create table if not exists public.listing_reports (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings (id) on delete cascade,
  reporter_key text not null,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_key)
);
create index if not exists listing_reports_listing_idx on public.listing_reports (listing_id);

-- طلبات تمييز الإعلانات (الدفع يدوي: تحويل ثم واتساب ثم تفعيل من الإدارة)
create table if not exists public.feature_requests (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  days int not null check (days in (7, 30, 90)),
  amount_usd numeric not null,
  status text not null default 'pending' check (status in ('pending', 'activated', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feature_requests_status_idx on public.feature_requests (status, created_at desc);
create index if not exists feature_requests_user_idx on public.feature_requests (user_id);

-- الوصول من السيرفر فقط (service_role)
alter table public.listing_reports enable row level security;
alter table public.feature_requests enable row level security;
revoke all on table public.listing_reports from anon, authenticated;
revoke all on table public.feature_requests from anon, authenticated;
