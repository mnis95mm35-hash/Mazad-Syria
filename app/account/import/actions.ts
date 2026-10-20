'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase_auth';
import { isLimited, recordEvent } from '@/lib/rate_limit';
import { listingService } from '@/lib/listing_service';
import { listingLimitError } from '@/lib/limits';
import { isTrustedOwner } from '@/lib/trust';
import { supabaseAdmin } from '@/lib/supabase';
import { adminUrl, notifyAdmin } from '@/lib/notify';
import { turnstileError } from '@/lib/turnstile';
import { MAX_IMAGES, parseListingFields, prepareImages, removeImages, uploadImages } from '@/lib/listing_form';

export type FbImportState = {
  error?: string;
  published?: number;
  review?: number;
  failed?: { row: number; msg: string }[];
};

const MAX_ROWS = 15;
const RULES = [
  { max: 4, windowMs: 60 * 60 * 1000 },
  { max: 12, windowMs: 24 * 60 * 60 * 1000 },
];
const FIELDS = ['title', 'description', 'price', 'currency', 'category', 'subcategory', 'city', 'area', 'sellerName', 'sellerPhone', 'rooms', 'sizeM2', 'carYear', 'carKm'];

// استيراد التاجر لإعلاناته من تصدير فيسبوك (حلّلها وراجعها في المتصفح). نفس قواعد النشر العادية:
// الموثوق ينشر فوراً، وغيره ينتظر المراجعة، وحد الباقة يُطبَّق على كل إعلان.
export async function importFbAction(_prev: FbImportState, fd: FormData): Promise<FbImportState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'سجّل الدخول أولاً.' };
  if (String(fd.get('consent') ?? '') !== 'yes') return { error: 'أكّد أن هذه إعلاناتك أو أنك مفوَّض بنشرها.' };

  let list: unknown;
  try {
    list = JSON.parse(String(fd.get('rows') ?? ''));
  } catch {
    return { error: 'بيانات غير صالحة.' };
  }
  if (!Array.isArray(list) || list.length === 0) return { error: 'لم تحدد أي إعلان.' };
  if (list.length > MAX_ROWS) return { error: `الحد الأقصى ${MAX_ROWS} إعلاناً في المرة. انشر على دفعات.` };

  const captcha = await turnstileError(fd);
  if (captcha) return { error: captcha };
  if (await isLimited('fbimport', RULES)) return { error: 'استوردت عدداً كبيراً في وقت قصير. حاول لاحقاً.' };
  await recordEvent('fbimport');

  const defName = String(fd.get('defaultName') ?? '').trim();
  const defPhone = String(fd.get('defaultPhone') ?? '').trim();
  const trusted = await isTrustedOwner(user.id).catch(() => false);
  const db = supabaseAdmin();

  const failed: { row: number; msg: string }[] = [];
  const seen = new Set<string>();
  let published = 0;
  let review = 0;

  for (let i = 0; i < list.length; i++) {
    const src = (list[i] && typeof list[i] === 'object' ? list[i] : {}) as Record<string, unknown>;
    const line = Number.isInteger(Number(src._line)) && Number(src._line) > 0 ? Number(src._line) : i + 1;
    const rec = new FormData();
    for (const k of FIELDS) rec.set(k, src[k] === null || src[k] === undefined ? '' : String(src[k]));
    if (!rec.get('sellerName')) rec.set('sellerName', defName);
    if (!rec.get('sellerPhone')) rec.set('sellerPhone', defPhone);

    const parsed = parseListingFields(rec);
    if ('error' in parsed) {
      failed.push({ row: line, msg: parsed.error });
      continue;
    }
    const f = parsed.fields;
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
    const { data: dup } = await db.from('listings').select('id').eq('user_id', user.id).eq('title', f.title).limit(1);
    if (dup && dup.length > 0) {
      failed.push({ row: line, msg: 'استوردته سابقاً (إعلان بنفس العنوان موجود عندك).' });
      continue;
    }
    const limitError = await listingLimitError(user.id);
    if (limitError) {
      failed.push({ row: line, msg: limitError });
      break;
    }

    const files = fd.getAll(`images_${line}`).filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length > MAX_IMAGES) {
      failed.push({ row: line, msg: `الحد الأقصى ${MAX_IMAGES} صور.` });
      continue;
    }
    const prepared = files.length ? await prepareImages(files) : { buffers: [] as Buffer[], thumbs: [] as Buffer[] };
    if ('error' in prepared) {
      failed.push({ row: line, msg: prepared.error });
      continue;
    }
    let names: string[] = [];
    try {
      let urls: string[] = [];
      if (prepared.buffers.length) {
        const up = await uploadImages(prepared.buffers, prepared.thumbs);
        if ('error' in up) throw new Error(up.error);
        urls = up.urls;
        names = up.names;
      }
      await listingService.createListing({ ...f, images: urls, userId: user.id, status: trusted ? 'active' : 'pending' });
      if (trusted) published++;
      else review++;
    } catch (e) {
      await removeImages(names);
      failed.push({ row: line, msg: e instanceof Error ? e.message : 'تعذّر الحفظ.' });
    }
  }

  if (review > 0) notifyAdmin(`📥 ${review} إعلان مستورد من فيسبوك بانتظار المراجعة.\n${adminUrl()}`);
  revalidatePath('/');
  revalidatePath('/account');
  return { published, review, failed };
}
