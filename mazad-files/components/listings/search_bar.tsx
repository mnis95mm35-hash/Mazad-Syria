import { CATEGORIES, CITIES } from '@/lib/sample_data';

export default function SearchBar({
  q,
  category,
  city,
}: {
  q?: string;
  category?: string;
  city?: string;
}) {
  return (
    <form action="/" className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
      <input
        name="q"
        defaultValue={q}
        placeholder="ابحث عن سيارة، شقة، جوال..."
        className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2"
      />
      <select name="category" defaultValue={category ?? ''} className="border border-gray-300 rounded-lg px-3 py-2">
        <option value="">كل الأقسام</option>
        {CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>{c.label}</option>
        ))}
      </select>
      <select name="city" defaultValue={city ?? ''} className="border border-gray-300 rounded-lg px-3 py-2">
        <option value="">كل المدن</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button type="submit" className="bg-emerald-600 text-white rounded-lg px-6 py-2 hover:bg-emerald-700">
        بحث
      </button>
    </form>
  );
}
