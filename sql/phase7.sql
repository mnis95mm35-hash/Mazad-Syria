-- المرحلة 7: حقول السيارات والعقارات، الموقع على الخريطة، أسباب الرفض، وتفاصيل البلاغات.
-- آمنة للتشغيل أكثر من مرة. شغّلها في Supabase > SQL Editor > New query > Run
-- مهم: شغّلها قبل رفع كود هذه الحزمة إلى Render.

-- مواصفات الإعلان (كلها اختيارية)
alter table public.listings add column if not exists condition text;
alter table public.listings add column if not exists car_year int;
alter table public.listings add column if not exists car_km int;
alter table public.listings add column if not exists gearbox text;
alter table public.listings add column if not exists fuel text;
alter table public.listings add column if not exists rooms int;
alter table public.listings add column if not exists size_m2 int;
alter table public.listings add column if not exists furnished boolean;

-- الموقع على الخريطة
alter table public.listings add column if not exists lat double precision;
alter table public.listings add column if not exists lng double precision;

-- المراجعة: سبب الرفض ووقت المراجعة
alter table public.listings add column if not exists reject_reason text;
alter table public.listings add column if not exists reviewed_at timestamptz;

-- فهارس للفلاتر
create index if not exists listings_car_year_idx on public.listings (car_year) where car_year is not null;
create index if not exists listings_rooms_idx on public.listings (rooms) where rooms is not null;

-- البلاغات: حالة المعالجة (تُحتسب للحجب التلقائي غير المعالَجة فقط)
alter table public.listing_reports add column if not exists resolved boolean not null default false;
alter table public.listing_reports add column if not exists resolved_at timestamptz;
create index if not exists listing_reports_open_idx on public.listing_reports (created_at desc) where resolved = false;
