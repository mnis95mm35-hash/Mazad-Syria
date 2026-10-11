-- المرحلة 3: عملة الإعلان (دولار/ليرة) والأقسام الفرعية
-- شغّله بعد phase1.sql و phase2.sql: Supabase > SQL Editor > New query > Run

alter table public.listings
  add column if not exists currency text not null default 'USD',
  add column if not exists subcategory text;

alter table public.listings
  add constraint listings_currency_check check (currency in ('USD', 'SYP'));

create index if not exists listings_category_city_sub_idx
  on public.listings (category, city, subcategory)
  where status = 'active';
