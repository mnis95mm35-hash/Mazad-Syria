'use client';

import { useActionState, useRef, useState, useTransition, type FormEvent } from 'react';
import Turnstile from '@/components/security/turnstile';
import { parseAdText } from '@/lib/ad_text';
import { createListingAction, updateListingAction, type FormState } from '@/app/listings/actions';
import { CATEGORIES, CITIES, type Listing } from '@/lib/sample_data';
import { CURRENCIES, areasOf, subsOf } from '@/lib/taxonomy';
import { CONDITIONS, FUELS, GEARBOXES, fieldsFor } from '@/lib/attributes';
import ImagePicker from '@/components/listings/image_picker';
import LocationPicker from '@/components/listings/location_picker';

const MAX_IMAGES = 5;

const input =
  'w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/40';

// نموذج واحد للإنشاء والتعديل: عند تمرير listing يعمل كنموذج تعديل
export default function ListingForm({ listing, captchaSiteKey = null }: { listing?: Listing; captchaSiteKey?: string | null }) {
  const editing = Boolean(listing);
  const [category, setCategory] = useState(listing?.category ?? '');
  const [city, setCity] = useState(listing?.city ?? '');
  const [sub, setSub] = useState(listing?.subcategory ?? '');
  const [kept, setKept] = useState<string[]>(listing?.images ?? []);
  const [state, action, pending] = useActionState<FormState, FormData>(
    editing ? updateListingAction : createListingAction,
    {},
  );
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [pasted, setPasted] = useState('');
  const [pasteMsg, setPasteMsg] = useState('');
  const [captchaOk, setCaptchaOk] = useState(editing || !captchaSiteKey);
  const f = fieldsFor(category, sub);

  // يملأ الحقول من نص الإعلان الملصوق. الحقول غير المعروفة تبقى كما هي ليكملها المستخدم
  function fillFromText() {
    const r = parseAdText(pasted);
    const form = formRef.current;
    if (!form || !r.title) {
      setPasteMsg('الصق نص الإعلان أولاً.');
      return;
    }
    const setVal = (name: string, v: string) => {
      const el = form.elements.namedItem(name) as unknown;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.value = v;
    };
    setVal('title', r.title);
    setVal('description', r.description);
    if (r.price !== null) setVal('price', String(r.price));
    if (r.currency) setVal('currency', r.currency);
    if (r.phone) setVal('sellerPhone', r.phone);
    if (r.category) {
      setCategory(r.category);
      setSub(r.subcategory ?? '');
    }
    if (r.city) setCity(r.city);
    const found = [r.price !== null && 'السعر', r.city && 'المحافظة', r.category && 'القسم', r.phone && 'الهاتف'].filter(Boolean);
    setPasteMsg(`تم ملء الحقول${found.length ? ` (${found.join('، ')})` : ''}. راجعها وأكمل الناقص قبل النشر.`);
  }

  // نرسل النموذج يدوياً حتى لا يمسح React الحقول والصور عند ظهور خطأ تحقق
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="relative bg-white border border-gray-200 rounded-xl p-6 space-y-4 max-w-2xl">
      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{state.error}</p>
      )}
      {listing && <input type="hidden" name="id" value={listing.id} />}

      {/* فخ للروبوتات: مخفي عن البشر */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          الموقع
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {!editing && (
        <details className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <summary className="cursor-pointer text-sm font-bold text-emerald-900">⚡ عندك نص جاهز؟ الصقه لنملأ الحقول عنك</summary>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={5}
            placeholder="الصق نص إعلانك هنا (من واتساب أو فيسبوك أو أي مكان كتبته فيه)..."
            className={`${input} mt-3`}
          />
          <button type="button" onClick={fillFromText} className="mt-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            املأ الحقول تلقائياً
          </button>
          {pasteMsg && <p className="mt-2 text-sm text-emerald-900">{pasteMsg}</p>}
        </details>
      )}

      <label className="block">
        <span className="block text-sm font-medium mb-1">عنوان الإعلان</span>
        <input name="title" required minLength={3} maxLength={120} defaultValue={listing?.title} className={input} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">القسم</span>
          <select
            name="category"
            required
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSub('');
            }}
            className={input}
          >
            <option value="" disabled>اختر القسم</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">المحافظة</span>
          <select name="city" required value={city} onChange={(e) => setCity(e.target.value)} className={input}>
            <option value="" disabled>اختر المحافظة</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {areasOf(city).length > 0 && (
        <label className="block">
          <span className="block text-sm font-medium mb-1">المدينة / البلدة / المنطقة (اختياري)</span>
          <select key={city} name="area" defaultValue={listing?.city === city ? (listing?.area ?? '') : ''} className={input}>
            <option value="">غير محدد</option>
            {areasOf(city).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      )}

      {subsOf(category).length > 0 && (
        <label className="block">
          <span className="block text-sm font-medium mb-1">القسم الفرعي (اختياري)</span>
          <select key={category} name="subcategory" value={sub} onChange={(e) => setSub(e.target.value)} className={input}>
            <option value="">بدون</option>
            {subsOf(category).map((s) => (
              <option key={s.slug} value={s.slug}>{s.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="block">
          <span className="block text-sm font-medium mb-1">السعر</span>
          <input name="price" type="number" min={0} step="any" required defaultValue={listing?.price} className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">العملة</span>
          <select name="currency" defaultValue={listing?.currency ?? 'USD'} className={input}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>

      {(f.condition || f.car || f.home || f.size) && (
        <fieldset className="space-y-4 rounded-xl bg-stone-50 p-4">
          <legend className="px-2 text-sm font-bold">المواصفات (اختيارية، لكنها تجذب المشترين وتظهر في الفلاتر)</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {f.condition && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium">الحالة</span>
                <select name="condition" defaultValue={listing?.condition ?? ''} className={input}>
                  <option value="">غير محدد</option>
                  {CONDITIONS.map((o) => (
                    <option key={o.v} value={o.v}>{o.label}</option>
                  ))}
                </select>
              </label>
            )}
            {f.car && (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">سنة الصنع</span>
                  <input name="carYear" type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} placeholder="مثال: 2018" defaultValue={listing?.carYear ?? ''} className={input} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">الكيلومترات المقطوعة</span>
                  <input name="carKm" type="number" inputMode="numeric" min={0} max={3000000} placeholder="مثال: 120000" defaultValue={listing?.carKm ?? ''} className={input} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">ناقل الحركة</span>
                  <select name="gearbox" defaultValue={listing?.gearbox ?? ''} className={input}>
                    <option value="">غير محدد</option>
                    {GEARBOXES.map((o) => (
                      <option key={o.v} value={o.v}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">نوع الوقود</span>
                  <select name="fuel" defaultValue={listing?.fuel ?? ''} className={input}>
                    <option value="">غير محدد</option>
                    {FUELS.map((o) => (
                      <option key={o.v} value={o.v}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {f.home && (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">عدد الغرف</span>
                  <input name="rooms" type="number" inputMode="numeric" min={1} max={20} defaultValue={listing?.rooms ?? ''} className={input} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">مفروش؟</span>
                  <select
                    name="furnished"
                    defaultValue={listing?.furnished === true ? 'yes' : listing?.furnished === false ? 'no' : ''}
                    className={input}
                  >
                    <option value="">غير محدد</option>
                    <option value="yes">نعم</option>
                    <option value="no">لا</option>
                  </select>
                </label>
              </>
            )}
            {f.size && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium">المساحة (م²)</span>
                <input name="sizeM2" type="number" inputMode="numeric" min={1} defaultValue={listing?.sizeM2 ?? ''} className={input} />
              </label>
            )}
          </div>
        </fieldset>
      )}

      {listing && (listing.images ?? []).length > 0 && (
        <fieldset>
          <legend className="block text-sm font-medium mb-2">الصور الحالية (أزل العلامة لحذف صورة)</legend>
          <div className="flex flex-wrap gap-3">
            {(listing.images ?? []).map((url) => (
              <label key={url} className="relative block h-24 w-24 overflow-hidden rounded-lg ring-1 ring-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <input
                  type="checkbox"
                  name="keep"
                  value={url}
                  checked={kept.includes(url)}
                  onChange={(e) => setKept((cur) => (e.target.checked ? [...cur, url] : cur.filter((u) => u !== url)))}
                  className="absolute right-1 top-1 h-5 w-5"
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <span className="mb-2 block text-sm font-medium">
          {editing ? 'إضافة صور جديدة' : 'صور الإعلان'} (اختياري، حتى {MAX_IMAGES} صور في المجموع)
        </span>
        <ImagePicker max={Math.max(MAX_IMAGES - kept.length, 0)} />
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1">الوصف</span>
        <textarea name="description" rows={5} defaultValue={listing?.description ?? ''} className={input} />
      </label>

      <div>
        <span className="mb-2 block text-sm font-medium">
          موقع {category === 'real-estate' ? 'العقار' : 'الإعلان'} على الخريطة (اختياري)
        </span>
        <LocationPicker
          city={city}
          initial={listing?.lat != null && listing?.lng != null ? { lat: listing.lat, lng: listing.lng } : null}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">اسمك</span>
          <input name="sellerName" required minLength={2} defaultValue={listing?.sellerName} className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">رقم الهاتف / واتساب</span>
          <input
            name="sellerPhone"
            type="tel"
            dir="ltr"
            required
            placeholder="09XXXXXXXX"
            defaultValue={listing?.sellerPhone ?? ''}
            className={input}
          />
        </label>
      </div>

      {!editing && <Turnstile siteKey={captchaSiteKey} resetKey={state} onReadyChange={setCaptchaOk} />}
      <button
        type="submit"
        disabled={pending || !captchaOk}
        className="bg-emerald-600 text-white rounded-lg px-8 py-3 hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? 'جارٍ الحفظ...' : !captchaOk ? 'بانتظار التحقق...' : editing ? 'احفظ التعديلات' : 'انشر الإعلان'}
      </button>
    </form>
  );
}
