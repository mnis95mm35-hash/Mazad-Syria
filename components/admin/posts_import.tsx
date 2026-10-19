'use client';

import { useActionState, useState, useTransition } from 'react';
import { importRowsAction, type ImportState } from '@/app/admin/import/actions';
import { parseAdText, splitPosts } from '@/lib/ad_text';
import { CATEGORIES, CITIES } from '@/lib/sample_data';
import { areasOf, subsOf } from '@/lib/taxonomy';
import ImagePicker from '@/components/listings/image_picker';

const MAX_IMAGES = 5;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

const input = 'w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm';

type Row = {
  on: boolean;
  title: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  subcategory: string;
  city: string;
  area: string;
  sellerName: string;
  sellerPhone: string;
  rooms: string;
  sizeM2: string;
  carYear: string;
  carKm: string;
};

const s = (v: string | number | null) => (v === null || v === undefined ? '' : String(v));

export default function PostsImport() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importRowsAction, {});
  const [, startTransition] = useTransition();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState('');
  const [batch, setBatch] = useState(0);

  function analyze() {
    const posts = splitPosts(text).slice(0, 100);
    if (posts.length === 0) {
      setNote('الصق المنشورات أولاً.');
      setRows([]);
      return;
    }
    setBatch((b) => b + 1);
    setRows(
      posts.map((p) => {
        const r = parseAdText(p);
        return {
          on: true,
          title: r.title,
          description: r.description,
          price: s(r.price),
          currency: r.currency ?? 'USD',
          category: r.category ?? '',
          subcategory: r.subcategory ?? '',
          city: r.city ?? '',
          area: r.area ?? '',
          sellerName: s(r.sellerName),
          sellerPhone: s(r.phone),
          rooms: s(r.rooms),
          sizeM2: s(r.sizeM2),
          carYear: s(r.carYear),
          carKm: s(r.carKm),
        };
      }),
    );
    setNote(`تم تحليل ${posts.length} منشوراً. راجع كل بطاقة (خاصة السعر) ثم عاين أو انشر.`);
  }

  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));

  function submit(mode: 'preview' | 'import', form: HTMLFormElement) {
    const fd = new FormData(form);
    fd.set('mode', mode);
    const chosen = rows.map((r, i) => ({ ...r, _line: i + 1 })).filter((r) => r.on);
    // لا نرسل صور الإعلانات غير المحددة، ونحمي من دفعة ثقيلة جداً
    let total = 0;
    rows.forEach((r, i) => {
      const key = `images_${i + 1}`;
      if (!r.on) {
        fd.delete(key);
        return;
      }
      for (const f of fd.getAll(key)) if (f instanceof File) total += f.size;
    });
    if (total > MAX_TOTAL_BYTES) {
      setNote('حجم الصور كبير على دفعة واحدة. انشر على دفعات (مثلاً 10 إعلانات في المرة).');
      return;
    }
    fd.set('rows', JSON.stringify(chosen));
    startTransition(() => action(fd));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        submit(submitter?.value === 'import' ? 'import' : 'preview', e.currentTarget);
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-bold">الصق المنشورات هنا (واحداً بعد الآخر)</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className={`${input} font-mono`}
          placeholder={'1 للبيع شقة في طرطوس ...\n2 للبيع أرض ...\nأو افصل بينها بسطر فيه --- أو بسطر فارغ'}
        />
      </label>
      <button type="button" onClick={analyze} className="rounded-lg bg-emerald-800 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">
        حلّل المنشورات
      </button>
      {note && <p className="text-sm text-emerald-900">{note}</p>}

      {rows.length > 0 && (
        <>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className={`space-y-2 rounded-xl p-4 ring-1 ${r.on ? 'bg-white ring-black/10' : 'bg-stone-100 opacity-60 ring-black/5'}`}>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" checked={r.on} onChange={(e) => patch(i, { on: e.target.checked })} />
                    إعلان {i + 1}
                  </label>
                  {!r.price && r.on && <span className="text-xs font-bold text-red-700">السعر ناقص</span>}
                </div>
                <input value={r.title} onChange={(e) => patch(i, { title: e.target.value })} className={input} aria-label="العنوان" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input value={r.price} onChange={(e) => patch(i, { price: e.target.value })} inputMode="decimal" placeholder="السعر" aria-label="السعر" className={input} />
                  <select value={r.currency} onChange={(e) => patch(i, { currency: e.target.value })} aria-label="العملة" className={input}>
                    <option value="USD">دولار $</option>
                    <option value="SYP">ليرة سورية</option>
                  </select>
                  <select value={r.category} onChange={(e) => patch(i, { category: e.target.value, subcategory: '' })} aria-label="القسم" className={input}>
                    <option value="">القسم؟</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.label}</option>
                    ))}
                  </select>
                  <select value={r.subcategory} onChange={(e) => patch(i, { subcategory: e.target.value })} aria-label="القسم الفرعي" className={input}>
                    <option value="">فرعي: بدون</option>
                    {subsOf(r.category).map((x) => (
                      <option key={x.slug} value={x.slug}>{x.label}</option>
                    ))}
                  </select>
                  <select value={r.city} onChange={(e) => patch(i, { city: e.target.value, area: '' })} aria-label="المحافظة" className={input}>
                    <option value="">المحافظة؟</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select value={r.area} onChange={(e) => patch(i, { area: e.target.value })} aria-label="المنطقة" className={input}>
                    <option value="">المنطقة: غير محددة</option>
                    {areasOf(r.city).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <input value={r.sellerName} onChange={(e) => patch(i, { sellerName: e.target.value })} placeholder="اسم البائع" aria-label="اسم البائع" className={input} />
                  <input value={r.sellerPhone} onChange={(e) => patch(i, { sellerPhone: e.target.value })} dir="ltr" placeholder="الهاتف" aria-label="الهاتف" className={input} />
                  <input value={r.rooms} onChange={(e) => patch(i, { rooms: e.target.value })} inputMode="numeric" placeholder="الغرف" aria-label="الغرف" className={input} />
                  <input value={r.sizeM2} onChange={(e) => patch(i, { sizeM2: e.target.value })} inputMode="numeric" placeholder="المساحة م²" aria-label="المساحة" className={input} />
                </div>
                <div className="pt-1">
                  <span className="mb-1 block text-xs font-bold text-gray-600">صور الإعلان (اختياري)</span>
                  <ImagePicker key={`${batch}-${i}`} name={`images_${i + 1}`} max={MAX_IMAGES} />
                </div>
                <details>
                  <summary className="cursor-pointer text-xs text-gray-500">الوصف</summary>
                  <textarea value={r.description} onChange={(e) => patch(i, { description: e.target.value })} rows={5} className={`${input} mt-1`} />
                </details>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold">اسم افتراضي (للناقص)</span>
              <input name="defaultName" className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold">هاتف افتراضي (للناقص)</span>
              <input name="defaultPhone" dir="ltr" className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold">بريد حساب المالك (اختياري)</span>
              <input name="ownerEmail" type="email" dir="ltr" className={input} />
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" value="yes" className="mt-1" />
            <span>أؤكد أن أصحاب هذه المنشورات وافقوا على نشرها في الموقع (مطلوب قبل النشر)</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" value="preview" disabled={pending} className="rounded-lg bg-stone-200 px-5 py-2 text-sm font-bold hover:bg-stone-300 disabled:opacity-60">
              {pending ? 'لحظة...' : 'معاينة وفحص'}
            </button>
            <button type="submit" value="import" disabled={pending} className="rounded-lg bg-emerald-800 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
              نشر المحدد
            </button>
          </div>
        </>
      )}

      {state.error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok !== undefined && (
        <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-black/5">
          <p className="font-bold text-emerald-800">
            {state.imported ? `تم نشر ${state.ok} إعلاناً.` : `${state.ok} إعلاناً سليماً جاهزاً للنشر.`}
            {state.failed && state.failed.length > 0 && <span className="mr-2 text-red-700">({state.failed.length} فيها أخطاء)</span>}
          </p>
          {state.failed && state.failed.length > 0 && (
            <ul className="mt-3 space-y-1 text-red-700">
              {state.failed.map((f) => (
                <li key={f.row}>إعلان {f.row}: {f.msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
