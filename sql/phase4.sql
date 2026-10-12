-- المرحلة 4: حسابات التجار (المعارض) والباقات الشهرية
-- شغّله بعد phase3b.sql: Supabase > SQL Editor > New query > Run

create table if not exists public.dealers (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  name text not null,
  description text,
  phone text,
  city text,
  address text,
  logo_url text,
  plan text not null default 'dealer' check (plan in ('dealer', 'dealer_pro')),
  plan_until timestamptz,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- طلبات الاشتراك والتجديد (الدفع يدوي: تحويل ثم واتساب ثم تفعيل من الإدارة)
create table if not exists public.plan_requests (
  id bigint generated always as identity primary key,
  dealer_id bigint not null references public.dealers (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  plan text not null check (plan in ('dealer', 'dealer_pro')),
  months int not null check (months in (1, 3, 12)),
  amount_usd numeric not null,
  status text not null default 'pending' check (status in ('pending', 'activated', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plan_requests_status_idx on public.plan_requests (status, created_at desc);
create index if not exists plan_requests_dealer_idx on public.plan_requests (dealer_id);

-- الوصول من السيرفر فقط (service_role)
alter table public.dealers enable row level security;
alter table public.plan_requests enable row level security;
revoke all on table public.dealers from anon, authenticated;
revoke all on table public.plan_requests from anon, authenticated;
