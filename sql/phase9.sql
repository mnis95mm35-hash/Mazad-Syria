-- المرحلة 9: مصادر التجار، مسودات الإعلانات (لا تظهر للزوار)، وسجل المهام.
-- آمنة للتشغيل أكثر من مرة. شغّلها في Supabase > SQL Editor > New query > Run
-- ملاحظة: الكود يعمل حتى لو لم تُشغَّل بعد (سجل المهام يتجاهل الخطأ)، لكن صفحة المسودات تحتاجها.

-- مصادر التجار (اسم نشاط عام فقط، لا محتوى منشورات)
create table if not exists public.lead_sources (
  id bigserial primary key,
  name text not null,
  sector text,                      -- cars | real-estate | furniture | electronics ...
  city text,
  url text,
  status text not null default 'new' check (status in ('new','contacted','replied','onboarded','rejected')),
  notes text,
  created_at timestamptz not null default now()
);

-- مسودات: نصوص أرسلها أصحابها أو أضافتها الإدارة بموافقتهم. لا تصبح إعلاناً إلا بعد تأكيد الموافقة
create table if not exists public.ad_drafts (
  id bigserial primary key,
  source_id bigint references public.lead_sources (id) on delete set null,
  raw_text text not null,
  title text not null,
  description text not null default '',
  price numeric,
  currency text not null default 'USD',
  category text,
  subcategory text,
  city text,
  area text,
  seller_name text,
  seller_phone text,
  extras jsonb not null default '{}'::jsonb,   -- rooms, sizeM2, carYear, carKm
  images text[] not null default '{}',
  dedupe_key text not null,
  status text not null default 'draft' check (status in ('draft','invited','claimed','published','rejected')),
  consent_at timestamptz,
  consent_note text,
  listing_id bigint references public.listings (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);
create index if not exists ad_drafts_status_idx on public.ad_drafts (status, created_at desc);
create unique index if not exists ad_drafts_dedupe_idx on public.ad_drafts (dedupe_key) where status in ('draft','invited','claimed');

-- سجل المهام الخلفية
create table if not exists public.job_runs (
  id bigserial primary key,
  job text not null,
  ok boolean not null,
  detail text,
  ms int,
  created_at timestamptz not null default now()
);
create index if not exists job_runs_idx on public.job_runs (created_at desc);

-- الوصول من السيرفر فقط (service_role)
alter table public.lead_sources enable row level security;
alter table public.ad_drafts enable row level security;
alter table public.job_runs enable row level security;
revoke all on table public.lead_sources, public.ad_drafts, public.job_runs from anon, authenticated;
