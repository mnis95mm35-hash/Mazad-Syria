'use server';

import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { MAX_IMAGES, parseListingFields, prepareImages, removeImages, uploadImages } from '@/lib/listing_form';
import { isAdmin } from '@/lib/admin_auth';
import { supabaseAdmin } from '@/lib/supabase';
import { mapHeader, normCategory, normCity, normCurrency, parseTable } from '@/lib/bulk_import';

export type ImportState = {
  error?: string;
  // نتيجة المعاينة أو الاستيراد
  ok?: number;
  failed?: { row: number; msg: string }[];
  imported?: boolean;
  preview?: { title: string; price: string; city: string; category: string }[];
};

const MAX_ROWS = 100;
const CONSENT_MSG = 'أكّد أن أصحاب الإعلانات وافقوا على نشرها (خانة الموافقة) قبل الاستيراد.';

// نبحث عن مستخدم بالبريد ليصير مالك الإعلانات (فيعدّلها ويديرها بنفسه ويظهر في صفحة معرضه)
async function findUserId(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

type Opts = { mode: 'preview' | 'import'; defaultName: string; defaultPhone: string; ownerEmail: string; consent: boolean; src?: FormData };

// قلب الاستيراد المشترك بين الجدول والمنشورات: كل سجل يمر على نفس تحقق نموذج الإعلان العادي
async function runImport(records: { line: number; rec: Record<string, string> }[], o: Opts): Promise<ImportState> {
  if (o.mode === 'import' && !o.consent) return { error: CONSENT_MSG };
  let ownerId: string | null = null;
  if (o.mode === 'import' && o.ownerEmail) {
    ownerId = await findUserId(o.ownerEmail);
    if (!ownerId) return { error: `لا يوجد حساب مسجّل بالبريد ${o.ownerEmail}. اطلب منه إنشاء حساب أولاً أو اترك الخانة فارغة.` };
  }

  const failed: { row: number; msg: string }[] = [];
  const preview: NonNullable<ImportState['preview']> = [];
  const seen = new Set<string>();
  let ok = 0;

  for (const { line, rec } of records) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(rec)) fd.set(k, String(v ?? ''));
    if (!fd.get('sellerName')) fd.set('sellerName', o.defaultName);
    if (!fd.get('sellerPhone')) fd.set('sellerPhone', o.defaultPhone);
    fd.set('currency', normCurrency(String(fd.get('currency') ?? '')));
    fd.set('category', normCategory(String(fd.get('category') ?? '')));
    fd.set('city', normCity(String(fd.get('city') ?? '')));

    const parsed = parseListingFields(fd);
    if ('error' in parsed) {
      failed.push({ row: line, msg: parsed.error });
      continue;
    }
    const f = parsed.fields;
    // السعر 0 يظهر للزوار كـ $0، فنطلب سعراً حقيقياً
    if (!(f.price > 0)) {
      failed.push({ row: line, msg: 'السعر مطلوب (أكبر من صفر).' });
      continue;
    }
    const key = `${f.sellerPhone}|${f.title}`;
    if (seen.has(key)) {
      failed.push({ row: line, msg: 'مكرر في نفس الدفعة.' });
      continue;
    }
    seen.add(key);

    // صور الإعلان (اختيارية): حقل images_<رقم الإعلان> في النموذج
    const files = o.src ? o.src.getAll(`images_${line}`).filter((x): x is File => x instanceof File && x.size > 0) : [];
    if (files.length > MAX_IMAGES) {
      failed.push({ row: line, msg: `الحد الأقصى ${MAX_IMAGES} صور لكل إعلان.` });
      continue;
    }
    const prepared = files.length ? await prepareImages(files) : { buffers: [] as Buffer[], thumbs: [] as Buffer[] };
    if ('error' in prepared) {
      failed.push({ row: line, msg: prepared.error });
      continue;
    }

    if (o.mode === 'import') {
      let names: string[] = [];
      try {
        let urls: string[] = [];
        if (prepared.buffers.length) {
          const up = await uploadImages(prepared.buffers, prepared.thumbs);
          if ('error' in up) throw new Error(up.error);
          urls = up.urls;
          names = up.names;
        }
        await listingService.createListing({ ...f, images: urls, userId: ownerId, status: 'active' });
      } catch (e) {
        await removeImages(names);
        failed.push({ row: line, msg: e instanceof Error ? e.message : 'تعذّر الحفظ.' });
        continue;
      }
    }
    ok++;
    if (preview.length < 8) preview.push({ title: f.title, price: `${f.price} ${f.currency}`, city: f.city, category: f.category });
  }

  if (o.mode === 'import') {
    revalidatePath('/');
    revalidatePath('/admin');
  }
  return { ok, failed, imported: o.mode === 'import', preview };
}

function optsFrom(fd: FormData): Opts {
  return {
    mode: String(fd.get('mode')) === 'import' ? 'import' : 'preview',
    defaultName: String(fd.get('defaultName') ?? '').trim(),
    defaultPhone: String(fd.get('defaultPhone') ?? '').trim(),
    ownerEmail: String(fd.get('ownerEmail') ?? '').trim(),
    consent: String(fd.get('consent') ?? '') === 'yes',
    src: fd,
  };
}

// استيراد من جدول (CSV أو منسوخ من Excel)
export async function importListingsAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  if (!(await isAdmin())) return { error: 'غير مصرّح.' };
  const text = String(fd.get('table') ?? '');
  if (text.length > 400_000) return { error: 'النص كبير جداً.' };

  const rows = parseTable(text);
  if (rows.length < 2) return { error: 'الصق الجدول مع صف العناوين في الأعلى وصف واحد على الأقل من الإعلانات.' };
  if (rows.length - 1 > MAX_ROWS) return { error: `الحد الأقصى ${MAX_ROWS} إعلاناً في المرة الواحدة.` };

  const cols = rows[0].map(mapHeader);
  if (!cols.includes('title') || !cols.includes('price')) return { error: 'يلزم عمودا «العنوان» و«السعر» على الأقل في صف العناوين.' };

  const records = rows.slice(1).map((r, i) => {
    const rec: Record<string, string> = {};
    cols.forEach((name, idx) => {
      if (name) rec[name] = r[idx] ?? '';
    });
    return { line: i + 2, rec };
  });
  return runImport(records, optsFrom(fd));
}

// استيراد من منشورات حلّلها المتصفح وراجعها المدير (JSON لصفوف حقولها بأسماء حقول النموذج)
export async function importRowsAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  if (!(await isAdmin())) return { error: 'غير مصرّح.' };
  const raw = String(fd.get('rows') ?? '');
  if (raw.length > 600_000) return { error: 'البيانات كبيرة جداً.' };
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return { error: 'بيانات غير صالحة.' };
  }
  if (!Array.isArray(list) || list.length === 0) return { error: 'لا توجد إعلانات محددة.' };
  if (list.length > MAX_ROWS) return { error: `الحد الأقصى ${MAX_ROWS} إعلاناً في المرة الواحدة.` };

  const allowed = ['title', 'description', 'price', 'currency', 'category', 'subcategory', 'city', 'area', 'sellerName', 'sellerPhone', 'rooms', 'sizeM2', 'carYear', 'carKm'];
  const records = list.map((item, i) => {
    const src = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const rec: Record<string, string> = {};
    for (const k of allowed) {
      const v = src[k];
      rec[k] = v === null || v === undefined ? '' : String(v);
    }
    const line = Number((src as { _line?: unknown })._line);
    return { line: Number.isInteger(line) && line > 0 ? line : i + 1, rec };
  });
  return runImport(records, optsFrom(fd));
}
