-- المرحلة 8: حالة "تم البيع" والمفضلة.
-- آمنة للتشغيل أكثر من مرة. شغّلها في Supabase > SQL Editor > New query > Run
-- مهم: شغّلها قبل رفع كود هذه الحزمة إلى Render.

-- "تم البيع": الإعلان يبقى بحالته الفعّالة لكن يُعلَّم ببيعه، فيختفي من القوائم ويبقى رابطه يعمل
alter table public.listings add column if not exists sold_at timestamptz;
create index if not exists listings_sold_idx on public.listings (sold_at) where sold_at is not null;

-- المفضلة: إعلان واحد لكل مستخدم مرة واحدة
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id bigint not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);

-- الوصول من السيرفر فقط (service_role)
alter table public.favorites enable row level security;
revoke all on table public.favorites from anon, authenticated;
