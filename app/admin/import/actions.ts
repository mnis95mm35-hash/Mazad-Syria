'use server';

import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { parseListingFields } from '@/lib/listing_form';
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

export async function importListingsAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  if (!(await isAdmin())) return { error: 'غير مصرّح.' };
  const mode = String(fd.get('mode')) === 'import' ? 'import' : 'preview';
  const text = String(fd.get('table') ?? '');
  const defaultName = String(fd.get('defaultName') ?? '').trim();
  const defaultPhone = String(fd.get('defaultPhone') ?? '').trim();
  const ownerEmail = String(fd.get('ownerEmail') ?? '').trim();
  if (text.length > 400_000) return { error: 'النص كبير جداً.' };

  const rows = parseTable(text);
  if (rows.length < 2) return { error: 'الصق الجدول مع صف العناوين في الأعلى وصف واحد على الأقل من الإعلانات.' };
  if (rows.length - 1 > MAX_ROWS) return { error: `الحد الأقصى ${MAX_ROWS} إعلاناً في المرة الواحدة.` };

  const cols = rows[0].map(mapHeader);
  if (!cols.includes('title') || !cols.includes('price')) return { error: 'يلزم عمودا «العنوان» و«السعر» على الأقل في صف العناوين.' };

  let ownerId: string | null = null;
  if (mode === 'import' && ownerEmail) {
    ownerId = await findUserId(ownerEmail);
    if (!ownerId) return { error: `لا يوجد حساب مسجّل بالبريد ${ownerEmail}. اطلب منه إنشاء حساب أولاً أو اترك الخانة فارغة.` };
  }

  const failed: { row: number; msg: string }[] = [];
  const preview: NonNullable<ImportState['preview']> = [];
  const seen = new Set<string>();
  let ok = 0;

  for (let i = 1; i < rows.length; i++) {
    const line = i + 1; // رقم السطر كما يراه المستخدم (العناوين = 1)
    const rec = new FormData();
    cols.forEach((name, idx) => {
      if (name) rec.set(name, rows[i][idx] ?? '');
    });
    if (!rec.get('sellerName')) rec.set('sellerName', defaultName);
    if (!rec.get('sellerPhone')) rec.set('sellerPhone', defaultPhone);
    rec.set('currency', normCurrency(String(rec.get('currency') ?? '')));
    rec.set('category', normCategory(String(rec.get('category') ?? '')));
    rec.set('city', normCity(String(rec.get('city') ?? '')));

    const parsed = parseListingFields(rec);
    if ('error' in parsed) {
      failed.push({ row: line, msg: parsed.error });
      continue;
    }
    const f = parsed.fields;
    const key = `${f.sellerPhone}|${f.title}`;
    if (seen.has(key)) {
      failed.push({ row: line, msg: 'مكرر في نفس الجدول.' });
      continue;
    }
    seen.add(key);

    if (mode === 'import') {
      try {
        await listingService.createListing({ ...f, images: [], userId: ownerId, status: 'active' });
      } catch (e) {
        failed.push({ row: line, msg: e instanceof Error ? e.message : 'تعذّر الحفظ.' });
        continue;
      }
    }
    ok++;
    if (preview.length < 8) preview.push({ title: f.title, price: `${f.price} ${f.currency}`, city: f.city, category: f.category });
  }

  if (mode === 'import') {
    revalidatePath('/');
    revalidatePath('/admin');
  }
  return { ok, failed, imported: mode === 'import', preview };
}
