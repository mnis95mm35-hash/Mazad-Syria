import type { ReactNode } from 'react';
import { CATEGORIES, CITIES } from '@/lib/sample_data';
import { CURRENCIES } from '@/lib/taxonomy';

const field =
  'w-full rounded-xl border-0 bg-white px-4 py-3.5 text-gray-900 shadow-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-amber-400';

export default function SearchBar({
  q,
  category,
  city,
  minPrice,
  maxPrice,
  sort,
  currency,
  action = '/',
  lockPlace = false,
  area,
  areaOptions,
  children,
}: {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  currency?: string;
  // مسار النموذج (صفحات التصنيف تستخدم مسارها الحالي)
  action?: string;
  // في صفحات التصنيف القسم والمدينة محددان بالمسار فنخفي قائمتيهما
  lockPlace?: boolean;
  // في صفحة محافظة نعرض قائمة مدنها وبلداتها
  area?: string;
  areaOptions?: string[];
  // حقول إضافية (فلاتر المواصفات) تظهر تحت الصف الثاني
  children?: ReactNode;
}) {
  return (
    <form action={action} className="space-y-3">
      <div className={`grid gap-3 ${lockPlace ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[1fr_200px_200px_auto]"}`}>
        <input name="q" defaultValue={q} aria-label="كلمة البحث" placeholder="ابحث عن سيارة، شقة، جوال..." className={field} />
        {!lockPlace && (<>
        <select name="category" aria-label="القسم" defaultValue={category ?? ''} className={field}>
          <option value="">كل الأقسام</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
        <select name="city" aria-label="المحافظة" defaultValue={city ?? ''} className={field}>
          <option value="">كل المحافظات</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        </>)}
        <button
          type="submit"
          className="rounded-xl bg-amber-400 px-8 py-3.5 font-bold text-emerald-950 shadow-sm transition hover:bg-amber-300"
        >
          بحث
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="minPrice" aria-label="السعر من" type="number" min={0} defaultValue={minPrice} placeholder="السعر من" className={field} />
        <input name="maxPrice" aria-label="السعر إلى" type="number" min={0} defaultValue={maxPrice} placeholder="السعر إلى" className={field} />
        {areaOptions && areaOptions.length > 0 && (
          <select name="area" defaultValue={area ?? ''} aria-label="المدينة أو البلدة" className={field}>
            <option value="">كل المدن والبلدات</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
        <select name="currency" defaultValue={currency ?? 'USD'} aria-label="عملة السعر" className={field}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <select name="sort" aria-label="الترتيب" defaultValue={sort ?? 'newest'} className={field}>
          <option value="newest">الأحدث</option>
          <option value="price_asc">السعر: من الأقل للأعلى</option>
          <option value="price_desc">السعر: من الأعلى للأقل</option>
        </select>
      </div>
      {children}
    </form>
  );
}
