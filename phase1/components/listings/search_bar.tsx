import { CATEGORIES, CITIES } from '@/lib/sample_data';

const field =
  'w-full rounded-xl border-0 bg-white px-4 py-3.5 text-gray-900 shadow-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-amber-400';

export default function SearchBar({
  q,
  category,
  city,
  minPrice,
  maxPrice,
  sort,
}: {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}) {
  return (
    <form action="/" className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_200px_200px_auto]">
        <input name="q" defaultValue={q} placeholder="ابحث عن سيارة، شقة، جوال..." className={field} />
        <select name="category" defaultValue={category ?? ''} className={field}>
          <option value="">كل الأقسام</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
        <select name="city" defaultValue={city ?? ''} className={field}>
          <option value="">كل المدن</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-amber-400 px-8 py-3.5 font-bold text-emerald-950 shadow-sm transition hover:bg-amber-300"
        >
          بحث
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input name="minPrice" type="number" min={0} defaultValue={minPrice} placeholder="السعر من ($)" className={field} />
        <input name="maxPrice" type="number" min={0} defaultValue={maxPrice} placeholder="السعر إلى ($)" className={field} />
        <select name="sort" defaultValue={sort ?? 'newest'} className={field}>
          <option value="newest">الأحدث</option>
          <option value="price_asc">السعر: من الأقل للأعلى</option>
          <option value="price_desc">السعر: من الأعلى للأقل</option>
        </select>
      </div>
    </form>
  );
}
