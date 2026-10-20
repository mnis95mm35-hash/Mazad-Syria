'use client';

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { importFbAction, type FbImportState } from '@/app/account/import/actions';
import { parseAdText } from '@/lib/ad_text';
import { extractPosts } from '@/lib/fb_export';
import { entryBlob, entryText, mimeOf, readZip, type ZipEntry } from '@/lib/zip_reader';
import { CATEGORIES, CITIES } from '@/lib/sample_data';
import { shrink } from '@/components/listings/image_picker';
import Turnstile from '@/components/security/turnstile';

const input = 'w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm';
const MAX_PICK = 15;
const MAX_IMAGES = 5;
const PAGE = 20;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

type F = { title: string; description: string; price: string; currency: string; category: string; subcategory: string; city: string; area: string; sellerName: string; sellerPhone: string; rooms: string; sizeM2: string; carYear: string; carKm: string };
type P = { key: string; ts: number; text: string; media: string[]; imgs: string[]; f: F; on: boolean; ads: boolean };
const s = (v: string | number | null) => (v === null || v === undefined ? '' : String(v));

function toF(text: string): F {
  const r = parseAdText(text);
  return {
    title: r.title, description: r.description, price: s(r.price), currency: r.currency ?? 'USD', category: r.category ?? '',
    subcategory: r.subcategory ?? '', city: r.city ?? '', area: r.area ?? '', sellerName: s(r.sellerName), sellerPhone: s(r.phone),
    rooms: s(r.rooms), sizeM2: s(r.sizeM2), carYear: s(r.carYear), carKm: s(r.carKm),
  };
}

function Thumb({ entry, onRemove }: { entry: ZipEntry | null; onRemove?: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    let u = '';
    if (!entry) return;
    entryBlob(entry)
      .then((b) => {
        if (!alive) return;
        u = URL.createObjectURL(b);
        setUrl(u);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [entry]);
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-black/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="حذف الصورة" className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white hover:bg-red-600">✕</button>
      )}
    </div>
  );
}

export default function FbImport({ captchaSiteKey }: { captchaSiteKey: string | null }) {
  const [state, action, pending] = useActionState<FbImportState, FormData>(importFbAction, {});
  const [, startTransition] = useTransition();
  const [posts, setPosts] = useState<P[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [adsOnly, setAdsOnly] = useState(true);
  const [shown, setShown] = useState(PAGE);
  const [captchaOk, setCaptchaOk] = useState(!captchaSiteKey);
  const byName = useRef(new Map<string, ZipEntry>());
  const byBase = useRef(new Map<string, ZipEntry[]>());

  function resolve(uri: string): ZipEntry | null {
    const norm = uri.replace(/\\/g, '/').replace(/^\/+/, '');
    const exact = byName.current.get(norm);
    if (exact) return exact;
    const cands = byBase.current.get(norm.split('/').pop() ?? '') ?? [];
    return cands.find((e) => e.name.endsWith(norm)) ?? (cands.length === 1 ? cands[0] : null);
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setMsg('');
    setPosts([]);
    setBusy('جارٍ قراءة الملف...');
    byName.current = new Map();
    byBase.current = new Map();
    try {
      const entries: ZipEntry[] = [];
      for (const f of Array.from(list)) entries.push(...(await readZip(f)));
      for (const e of entries) {
        byName.current.set(e.name, e);
        const base = e.name.split('/').pop() ?? '';
        byBase.current.set(base, [...(byBase.current.get(base) ?? []), e]);
      }
      const jsons = entries.filter((e) => /\.json$/i.test(e.name) && /post/i.test(e.name) && e.size < 80 * 1024 * 1024);
      const found = new Map<string, ReturnType<typeof extractPosts>[number]>();
      for (let i = 0; i < jsons.length; i++) {
        setBusy(`جارٍ تحليل المنشورات (${i + 1}/${jsons.length})...`);
        try {
          for (const p of extractPosts(JSON.parse(await entryText(jsons[i])))) found.set(p.key, p);
        } catch {
          // ملف JSON غير مفهوم: نتجاوزه
        }
      }
      const all = Array.from(found.values()).sort((a, b) => b.ts - a.ts).slice(0, 400);
      if (all.length === 0) {
        const hasHtml = entries.some((e) => /\.html?$/i.test(e.name));
        setMsg(hasHtml ? 'لم نجد منشورات. يبدو أن التصدير بصيغة HTML: أعد التنزيل واختر JSON.' : 'لم نجد منشورات في هذا الملف. تأكد أنك اخترت قسم «المنشورات» وصيغة JSON.');
      } else {
        const mapped = all.map<P>((p) => {
          const f = toF(p.text);
          const ads = Boolean(p.text.length > 25 && (f.category || f.price));
          return { key: p.key, ts: p.ts, text: p.text, media: p.media, imgs: p.media.filter((u) => resolve(u)).slice(0, MAX_IMAGES), f, on: false, ads };
        });
        setPosts(mapped);
        setShown(PAGE);
        setMsg(`وجدنا ${mapped.length} منشوراً (${mapped.filter((p) => p.ads).length} منها يبدو إعلاناً). اختر ما تريد نشره.`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذّرت قراءة الملف.');
    }
    setBusy('');
  }

  const patch = (key: string, p: Partial<P>) => setPosts((cur) => cur.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const patchF = (key: string, p: Partial<F>) => setPosts((cur) => cur.map((x) => (x.key === key ? { ...x, f: { ...x.f, ...p } } : x)));
  const picked = posts.filter((p) => p.on);
  const visible = useMemo(() => posts.filter((p) => !adsOnly || p.ads || p.on), [posts, adsOnly]);

  function toggle(p: P, on: boolean) {
    if (on && picked.length >= MAX_PICK) {
      setMsg(`الحد الأقصى ${MAX_PICK} إعلاناً في الدفعة الواحدة. انشرها ثم استورد غيرها.`);
      return;
    }
    patch(p.key, { on });
  }

  async function submit(form: HTMLFormElement) {
    if (picked.length === 0) {
      setMsg('حدد إعلاناً واحداً على الأقل.');
      return;
    }
    const fd = new FormData(form);
    let total = 0;
    setBusy('جارٍ تجهيز الصور...');
    for (let i = 0; i < picked.length; i++) {
      for (const uri of picked[i].imgs) {
        const e = resolve(uri);
        if (!e) continue;
        try {
          const file = new File([await entryBlob(e)], e.name.split('/').pop() ?? 'photo.jpg', { type: mimeOf(e.name) });
          const small = await shrink(file);
          if (small.size > 3 * 1024 * 1024) continue;
          total += small.size;
          fd.append(`images_${i + 1}`, small);
        } catch {
          // صورة تالفة: نتجاوزها
        }
      }
    }
    setBusy('');
    if (total > MAX_TOTAL_BYTES) {
      setMsg('حجم الصور كبير على دفعة واحدة. قلّل عدد الإعلانات أو الصور وأعد المحاولة.');
      return;
    }
    fd.set('rows', JSON.stringify(picked.map((p, i) => ({ ...p.f, _line: i + 1 }))));
    setMsg('');
    startTransition(() => action(fd));
  }

  const done = state.published !== undefined || state.review !== undefined;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-2 text-lg font-extrabold">الخطوة 2: اختر ملف التنزيل</h2>
        <input type="file" accept=".zip,application/zip" multiple onChange={(e) => void onFiles(e.target.files)} className="block w-full text-sm" />
        {busy && <p className="mt-2 text-sm text-emerald-900">{busy}</p>}
        {msg && <p className="mt-2 text-sm text-emerald-900">{msg}</p>}
      </section>

      {posts.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(e.currentTarget);
          }}
          className="space-y-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={adsOnly} onChange={(e) => setAdsOnly(e.target.checked)} />
            إظهار المنشورات التي تبدو إعلانات فقط
          </label>

          <div className="space-y-3">
            {visible.slice(0, shown).map((p) => (
              <div key={p.key} className={`space-y-2 rounded-xl p-4 ring-1 ${p.on ? 'bg-white ring-emerald-600' : 'bg-white ring-black/10'}`}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={p.on} onChange={(e) => toggle(p, e.target.checked)} className="mt-1" />
                  <span className="flex-1">
                    <span className="block text-xs text-gray-500">{new Date(p.ts * 1000).toLocaleDateString('en-GB')} · 📷 {p.imgs.length}</span>
                    <span className="line-clamp-3 whitespace-pre-line">{p.text || '(بلا نص)'}</span>
                  </span>
                </label>

                {p.on && (
                  <div className="space-y-2 border-t border-black/5 pt-2">
                    {p.imgs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {p.imgs.map((u) => (
                          <Thumb key={u} entry={resolve(u)} onRemove={() => patch(p.key, { imgs: p.imgs.filter((x) => x !== u) })} />
                        ))}
                      </div>
                    )}
                    <input value={p.f.title} onChange={(e) => patchF(p.key, { title: e.target.value })} className={input} aria-label="العنوان" placeholder="العنوان" />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <input value={p.f.price} onChange={(e) => patchF(p.key, { price: e.target.value })} inputMode="decimal" placeholder="السعر" aria-label="السعر" className={`${input} ${p.f.price ? '' : 'border-amber-400'}`} />
                      <select value={p.f.currency} onChange={(e) => patchF(p.key, { currency: e.target.value })} aria-label="العملة" className={input}>
                        <option value="USD">دولار $</option>
                        <option value="SYP">ليرة سورية</option>
                      </select>
                      <select value={p.f.category} onChange={(e) => patchF(p.key, { category: e.target.value, subcategory: '' })} aria-label="القسم" className={`${input} ${p.f.category ? '' : 'border-amber-400'}`}>
                        <option value="">القسم؟</option>
                        {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                      </select>
                      <select value={p.f.city} onChange={(e) => patchF(p.key, { city: e.target.value, area: '' })} aria-label="المحافظة" className={`${input} ${p.f.city ? '' : 'border-amber-400'}`}>
                        <option value="">المحافظة؟</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input value={p.f.sellerPhone} onChange={(e) => patchF(p.key, { sellerPhone: e.target.value })} dir="ltr" placeholder="الهاتف (إن اختلف)" aria-label="الهاتف" className={input} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {visible.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-bold hover:bg-stone-300">
              عرض المزيد ({visible.length - shown})
            </button>
          )}

          <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold">الخطوة 3: انشر ({picked.length} محدد)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold">اسمك (للإعلانات التي بلا اسم)</span>
                <input name="defaultName" required minLength={2} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold">هاتفك (للإعلانات التي بلا رقم)</span>
                <input name="defaultPhone" required dir="ltr" inputMode="tel" className={input} />
              </label>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" value="yes" className="mt-1" />
              <span>هذه إعلاناتي أو أنا مفوَّض بنشرها، وأوافق على نشرها في الموقع.</span>
            </label>
            {captchaSiteKey && <Turnstile siteKey={captchaSiteKey} resetKey={state} onReadyChange={setCaptchaOk} />}
            <button
              type="submit"
              disabled={pending || !!busy || !captchaOk || picked.length === 0}
              className="rounded-xl bg-emerald-800 px-6 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending || busy ? 'لحظة...' : !captchaOk ? 'بانتظار التحقق...' : `نشر ${picked.length} إعلان`}
            </button>
          </section>
        </form>
      )}

      {state.error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>}
      {done && (
        <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-black/5">
          <p className="font-bold text-emerald-800">
            {state.published ? `نُشر ${state.published} إعلاناً. ` : ''}
            {state.review ? `${state.review} إعلاناً وصل للمراجعة وسيُنشر قريباً. ` : ''}
            {!state.published && !state.review ? 'لم يُنشر شيء.' : ''}
          </p>
          {state.failed && state.failed.length > 0 && (
            <ul className="mt-2 space-y-1 text-red-700">
              {state.failed.map((f) => <li key={f.row}>إعلان {f.row}: {f.msg}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
