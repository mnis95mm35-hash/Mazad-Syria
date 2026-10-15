import { CONDITIONS, FUELS, GEARBOXES, fieldsFor, type ExtraFilterRaw } from '@/lib/attributes';

const field =
  'w-full rounded-xl border-0 bg-white px-4 py-3.5 text-gray-900 shadow-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-amber-400';

// فلاتر المواصفات حسب القسم: سيارات (سنة، كيلومترات، ناقل، وقود)، عقارات (غرف، مساحة)، وحالة السلعة
export default function ExtraFilters({ category, values }: { category: string; values: ExtraFilterRaw }) {
  const f = fieldsFor(category);
  if (!f.car && !f.condition && category !== 'real-estate') return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {f.car && (
        <>
          <input name="yearFrom" type="number" min={1950} aria-label="سنة الصنع من" placeholder="سنة الصنع من" defaultValue={values.yearFrom} className={field} />
          <input name="yearTo" type="number" min={1950} aria-label="سنة الصنع إلى" placeholder="سنة الصنع إلى" defaultValue={values.yearTo} className={field} />
          <input name="kmTo" type="number" min={0} aria-label="الكيلومترات حتى" placeholder="كيلومترات حتى" defaultValue={values.kmTo} className={field} />
          <select name="gearbox" aria-label="ناقل الحركة" defaultValue={values.gearbox ?? ''} className={field}>
            <option value="">كل أنواع الناقل</option>
            {GEARBOXES.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
          <select name="fuel" aria-label="الوقود" defaultValue={values.fuel ?? ''} className={field}>
            <option value="">كل أنواع الوقود</option>
            {FUELS.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
        </>
      )}
      {category === 'real-estate' && (
        <>
          <select name="roomsFrom" aria-label="عدد الغرف" defaultValue={values.roomsFrom ?? ''} className={field}>
            <option value="">عدد الغرف</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}{n === 5 ? '+' : ''} غرف فأكثر</option>
            ))}
          </select>
          <input name="sizeFrom" type="number" min={0} aria-label="المساحة من" placeholder="المساحة من (م²)" defaultValue={values.sizeFrom} className={field} />
          <input name="sizeTo" type="number" min={0} aria-label="المساحة إلى" placeholder="المساحة إلى (م²)" defaultValue={values.sizeTo} className={field} />
        </>
      )}
      {f.condition && (
        <select name="condition" aria-label="الحالة" defaultValue={values.condition ?? ''} className={field}>
          <option value="">جديد ومستعمل</option>
          {CONDITIONS.map((o) => (
            <option key={o.v} value={o.v}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
