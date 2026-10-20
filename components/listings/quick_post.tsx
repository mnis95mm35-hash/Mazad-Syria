'use client';

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { quickPostAction, type QuickState } from '@/app/quick/actions';
import { parseAdText } from '@/lib/ad_text';
import { CATEGORIES, CITIES } from '@/lib/sample_data';
import { SITE } from '@/lib/site_config';
import ImagePicker from '@/components/listings/image_picker';
import Turnstile from '@/components/security/turnstile';

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const HIDE_ON = ['/admin', '/listings/new', '/login', '/register'];

type F = {
  title: string; description: string; price: string; currency: string; category: string; subcategory: string;
  city: string; area: string; sellerName: string; sellerPhone: string; rooms: string; sizeM2: string; carYear: string; carKm: string;
};
const EMPTY: F = {
  title: '', description: '', price: '', currency: 'USD', category: '', subcategory: '', city: '', area: '',
  sellerName: '', sellerPhone: '', rooms: '', sizeM2: '', carYear: '', carKm: '',
};
const s = (v: string | number | null) => (v === null || v === undefined ? '' : String(v));

function Sheet({ captchaSiteKey, onClose }: { captchaSiteKey: string | null; onClose: () => void }) {
  const [state, action, pending] = useActionState<QuickState, FormData>(quickPostAction, {});
  const [, startTransition] = useTransition();
  const [text, setText] = useState('');
  const [f, setF] = useState<F>(EMPTY);
  const [captchaOk, setCaptchaOk] = useState(!captchaSiteKey);
  const touched = useRef(new Set<string>());

  const set = (k: keyof F, v: string) => {
    touched.current.add(k);
    setF((cur) => ({ ...cur, [k]: v }));
  };

  // نحلّل النص أثناء اللصق، ولا نمسّ حقلاً عدّله المستخدم بنفسه
  useEffect(() => {
    if (text.trim().length < 15) return;
    const r = parseAdText(text);
    const next: Partial<F> = {
      title: r.title, description: r.description, price: s(r.price), currency: r.currency ?? 'USD',
      category: r.category ?? '', subcategory: r.subcategory ?? '', city: r.city ?? '', area: r.area ?? '',
      sellerName: s(r.sellerName), sellerPhone: s(r.phone), rooms: s(r.rooms), sizeM2: s(r.sizeM2), carYear: s(r.carYear), carKm: s(r.carKm),
    };
    setF((cur) => {
      const out = { ...cur };
      (Object.keys(next) as (keyof F)[]).forEach((k) => {
        if (!touched.current.has(k)) out[k] = next[k] as string;
      });
      return out;
    });
  }, [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  const missing = (v: string) => (v ? '' : 'border-amber-400');
  const waText = `مرحباً، أريد نشر إعلان على ${SITE.name}:\n\n${text}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label="انشر إعلانك" dir="rtl">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">انشر إعلانك بلصق نصه</h2>
            <p className="mt-1 text-sm text-gray-600">انسخ إعلانك من واتساب أو فيسبوك (اضغط مطولاً ثم «نسخ») والصقه هنا، وأضف صورك.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full bg-stone-100 px-3 py-1 text-lg font-bold hover:bg-stone-200">✕</button>
        </div>

        {state.done ? (
          <div className="space-y-3 rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
            <p className="text-base font-extrabold">
              {state.done === 'published' ? '🎉 تم نشر إعلانك!' : '✅ وصلنا إعلانك'}
            </p>
            <p>
              {state.done === 'published'
                ? 'إعلانك ظاهر الآن للزوار.'
                : 'سنراجعه وقد نراسلك على واتساب للتأكد من رقمك، ثم ننشره قريباً. النشر مجاني.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {state.id && <Link href={`/listings/${state.id}`} className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white">عرض الإعلان</Link>}
              <button type="button" onClick={onClose} className="rounded-lg bg-white px-4 py-2 font-bold ring-1 ring-black/10">إغلاق</button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className={`${input} leading-7`}
              placeholder={'الصق نص إعلانك هنا...\nمثال: للبيع شقة 110م² غرفتين في طرطوس، السعر 45000$، للتواصل 09XXXXXXXX'}
              aria-label="نص الإعلان"
            />

            {text.trim().length >= 15 && (
              <div className="space-y-2 rounded-xl bg-stone-50 p-3 ring-1 ring-black/5">
                <p className="text-xs font-bold text-emerald-900">راجع ما فهمناه وصحّح الناقص (الحقول البرتقالية ناقصة):</p>
                <input name="title" value={f.title} onChange={(e) => set('title', e.target.value)} className={`${input} ${missing(f.title)}`} aria-label="العنوان" placeholder="العنوان" />
                <div className="grid grid-cols-2 gap-2">
                  <input name="price" value={f.price} onChange={(e) => set('price', e.target.value)} inputMode="decimal" placeholder="السعر" aria-label="السعر" className={`${input} ${missing(f.price)}`} />
                  <select name="currency" value={f.currency} onChange={(e) => set('currency', e.target.value)} aria-label="العملة" className={input}>
                    <option value="USD">دولار $</option>
                    <option value="SYP">ليرة سورية</option>
                  </select>
                  <select name="category" value={f.category} onChange={(e) => { set('category', e.target.value); set('subcategory', ''); }} aria-label="القسم" className={`${input} ${missing(f.category)}`}>
                    <option value="">القسم؟</option>
                    {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                  </select>
                  <select name="city" value={f.city} onChange={(e) => { set('city', e.target.value); set('area', ''); }} aria-label="المحافظة" className={`${input} ${missing(f.city)}`}>
                    <option value="">المحافظة؟</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input name="sellerName" value={f.sellerName} onChange={(e) => set('sellerName', e.target.value)} placeholder="اسمك" aria-label="اسمك" className={`${input} ${missing(f.sellerName)}`} />
                  <input name="sellerPhone" value={f.sellerPhone} onChange={(e) => set('sellerPhone', e.target.value)} dir="ltr" inputMode="tel" placeholder="رقم الهاتف" aria-label="رقم الهاتف" className={`${input} ${missing(f.sellerPhone)}`} />
                </div>
                {(['description', 'subcategory', 'area', 'rooms', 'sizeM2', 'carYear', 'carKm'] as const).map((k) => (
                  <input key={k} type="hidden" name={k} value={f[k]} />
                ))}
              </div>
            )}

            <div>
              <span className="mb-1 block text-sm font-bold">الصور (اختياري، حتى 5)</span>
              <ImagePicker max={5} />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" value="yes" className="mt-1" />
              <span>هذا إعلاني أو أنا مفوَّض بنشره، وأوافق على نشره في الموقع.</span>
            </label>

            {captchaSiteKey && <Turnstile siteKey={captchaSiteKey} resetKey={state} onReadyChange={setCaptchaOk} />}
            {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

            <button
              type="submit"
              disabled={pending || !captchaOk || text.trim().length < 15}
              className="w-full rounded-xl bg-emerald-800 px-5 py-3 text-base font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'جارٍ الإرسال...' : !captchaOk ? 'بانتظار التحقق...' : 'انشر الإعلان'}
            </button>

            <p className="text-center text-xs text-gray-500">
              تفضّل واتساب؟{' '}
              <a href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="font-bold text-green-700 hover:underline">
                أرسل إعلانك إلينا هناك
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// زر عائم يفتح نافذة النشر السريع في أي صفحة. النافذة (والتحقق الأمني) لا تُحمَّل إلا عند الضغط.
export default function QuickPost({ captchaSiteKey }: { captchaSiteKey: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (HIDE_ON.some((p) => path === p || path.startsWith(`${p}/`)) || /^\/listings\/[^/]+\/edit/.test(path)) return null;
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-3 text-sm font-extrabold text-white shadow-lg ring-2 ring-white hover:bg-emerald-700"
        >
          <span aria-hidden="true">📋</span> انشر إعلانك
        </button>
      )}
      {open && <Sheet captchaSiteKey={captchaSiteKey} onClose={() => setOpen(false)} />}
    </>
  );
}
