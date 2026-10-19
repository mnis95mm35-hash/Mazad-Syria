'use client';

import { useEffect, useRef, useState } from 'react';

const MAX_BYTES = 3 * 1024 * 1024;

type Item = { id: string; file: File; url: string };

// يصغّر صور الهاتف الكبيرة قبل الرفع (1600px) فتنجح ضمن حد 3 ميغابايت وترفع أسرع.
// عند أي فشل نعيد الملف الأصلي كما هو.
async function shrink(file: File): Promise<File> {
  try {
    if (!file.type.startsWith('image/')) return file;
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.max(Math.round(bmp.width * scale), 1);
    const h = Math.max(Math.round(bmp.height * scale), 1);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob) return file;
    if (scale === 1 && blob.size >= file.size && file.size <= MAX_BYTES) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

// اختيار الصور: التقاط مباشر بالكاميرا أو من الملفات، مع معاينة وحذف.
// الصور المختارة تُوضع في حقل ملفات مخفي باسم images ليرسلها النموذج كالمعتاد.
export default function ImagePicker({ max, name = 'images' }: { max: number; name?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const hidden = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    if (!hidden.current) return;
    const dt = new DataTransfer();
    items.forEach((i) => dt.items.add(i.file));
    hidden.current.files = dt.files;
  }, [items]);

  useEffect(() => {
    const all = urls.current;
    return () => all.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const room = Math.max(max - items.length, 0);

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    setMsg('');
    setBusy(true);
    const picked = Array.from(list).slice(0, room);
    const extra = list.length - picked.length;
    const next: Item[] = [];
    let tooBig = false;
    for (const f of picked) {
      const small = await shrink(f);
      if (small.size > MAX_BYTES) {
        tooBig = true;
        continue;
      }
      const url = URL.createObjectURL(small);
      urls.current.push(url);
      next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: small, url });
    }
    setItems((cur) => [...cur, ...next]);
    setBusy(false);
    const notes: string[] = [];
    if (extra > 0) notes.push(`الحد الأقصى ${max} صور، تجاهلنا ${extra}.`);
    if (tooBig) notes.push('تعذّر استخدام صورة لأن حجمها كبير جداً.');
    setMsg(notes.join(' '));
    if (camera.current) camera.current.value = '';
    if (gallery.current) gallery.current.value = '';
  }

  function remove(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    setMsg('');
  }

  const btn =
    'rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div>
      <input ref={hidden} type="file" name={name} multiple className="hidden" tabIndex={-1} aria-hidden="true" />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void add(e.target.files)}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void add(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || room === 0} onClick={() => camera.current?.click()} className={btn}>
          📷 التقاط صورة بالكاميرا
        </button>
        <button type="button" disabled={busy || room === 0} onClick={() => gallery.current?.click()} className={btn}>
          🖼️ اختيار من الملفات
        </button>
        <span className="text-xs text-gray-500">
          {busy ? 'جارٍ تجهيز الصور...' : `${items.length} من ${max}`}
        </span>
      </div>
      {msg && <p className="mt-2 text-xs text-amber-700">{msg}</p>}
      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {items.map((i, idx) => (
            <div key={i.id} className="relative h-24 w-24 overflow-hidden rounded-lg ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.url} alt={`صورة ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i.id)}
                aria-label={`حذف الصورة ${idx + 1}`}
                className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
