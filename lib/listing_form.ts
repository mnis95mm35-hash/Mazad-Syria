import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { CATEGORIES, CITIES } from '@/lib/sample_data';
import { isValidPhone } from '@/lib/phone';
import { parseExtras, type ListingExtras } from '@/lib/attributes';
import { isCurrency, isValidArea, isValidSub, type Currency } from '@/lib/taxonomy';
import { IMAGE_BUCKET, publicImageUrl, supabaseAdmin } from '@/lib/supabase';

export const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export type ListingFields = {
  title: string;
  description: string | null;
  price: number;
  category: string;
  city: string;
  sellerName: string;
  sellerPhone: string;
  currency: Currency;
  subcategory: string | null;
  area: string | null;
} & ListingExtras;

// تحقق موحّد لحقول نموذج الإعلان (إنشاء وتعديل)
export function parseListingFields(fd: FormData): { error: string } | { fields: ListingFields } {
  const title = String(fd.get('title') ?? '').trim();
  const description = String(fd.get('description') ?? '').trim();
  const price = Number(fd.get('price'));
  const category = String(fd.get('category') ?? '');
  const city = String(fd.get('city') ?? '');
  const sellerName = String(fd.get('sellerName') ?? '').trim();
  const sellerPhone = String(fd.get('sellerPhone') ?? '').trim();
  const currency = fd.get('currency');
  const subcategory = String(fd.get('subcategory') ?? '');
  const area = String(fd.get('area') ?? '');

  if (title.length < 3) return { error: 'العنوان قصير جداً (3 أحرف على الأقل).' };
  if (title.length > 120) return { error: 'العنوان طويل جداً.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'السعر غير صالح.' };
  if (!isCurrency(currency)) return { error: 'اختر عملة السعر.' };
  if (!CATEGORIES.some((c) => c.slug === category)) return { error: 'اختر قسماً من القائمة.' };
  if (subcategory && !isValidSub(category, subcategory)) return { error: 'القسم الفرعي لا يناسب القسم المختار.' };
  if (!CITIES.includes(city)) return { error: 'اختر محافظة من القائمة.' };
  if (area && !isValidArea(city, area)) return { error: 'المدينة أو البلدة لا تناسب المحافظة المختارة.' };
  if (sellerName.length < 2) return { error: 'أدخل اسمك.' };
  if (!sellerPhone) return { error: 'رقم الهاتف مطلوب ليتمكن المشترون من التواصل معك.' };
  if (!isValidPhone(sellerPhone)) return { error: 'رقم الهاتف غير صالح.' };
  const extras = parseExtras(category, subcategory || null, fd);
  if ('error' in extras) return { error: extras.error };
  return {
    fields: {
      ...extras.extras,
      title,
      description: description || null,
      price,
      category,
      city,
      sellerName,
      sellerPhone,
      currency,
      subcategory: subcategory || null,
      area: area || null,
    },
  };
}

export function filesFrom(fd: FormData): File[] {
  return fd.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
}

// نتحقق من محتوى الملف الفعلي وليس من اسمه أو نوعه المُعلن فقط
function detectImageExt(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

// تحقق + إعادة ترميز: تصغير إلى 1600px وتحويل إلى WEBP، وهذا يحذف بيانات EXIF (ومنها GPS)
export async function prepareImages(files: File[]): Promise<{ error: string } | { buffers: Buffer[]; thumbs: Buffer[] }> {
  const buffers: Buffer[] = [];
  const thumbs: Buffer[] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) return { error: 'حجم إحدى الصور كبير (الحد الأقصى 3 ميغابايت للصورة).' };
    const raw = Buffer.from(await file.arrayBuffer());
    if (!detectImageExt(raw)) return { error: 'نوع إحدى الصور غير مدعوم (JPG أو PNG أو WEBP فقط).' };
    try {
      buffers.push(
        await sharp(raw)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      );
      // نسخة مصغّرة (480px) لبطاقات القوائم: أخف بكثير على الموبايل
      thumbs.push(
        await sharp(raw)
          .rotate()
          .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 72 })
          .toBuffer(),
      );
    } catch {
      return { error: 'تعذّرت معالجة إحدى الصور. جرّب صورة أخرى.' };
    }
  }
  return { buffers, thumbs };
}

// يرفع الصور؛ عند أي فشل يحذف ما رُفع ويعيد خطأ.
// مع thumbs: تُرفع نسختان لكل صورة (-l و -s)، والاسم الذي يُعاد هو اسم الكبيرة.
export async function uploadImages(
  buffers: Buffer[],
  thumbs?: Buffer[],
): Promise<{ error: string } | { urls: string[]; names: string[] }> {
  const storage = supabaseAdmin().storage.from(IMAGE_BUCKET);
  const urls: string[] = [];
  const names: string[] = [];
  const fail = async () => {
    await removeImages(names);
    return { error: 'تعذّر رفع الصور، حاول مرة أخرى.' } as const;
  };
  for (let i = 0; i < buffers.length; i++) {
    const base = randomUUID();
    const name = thumbs ? `${base}-l.webp` : `${base}.webp`;
    const { error } = await storage.upload(name, buffers[i], { contentType: 'image/webp', cacheControl: '31536000' });
    if (error) return fail();
    names.push(name);
    if (thumbs) {
      const t = await storage.upload(`${base}-s.webp`, thumbs[i], { contentType: 'image/webp', cacheControl: '31536000' });
      // فشل المصغّرة لا يكسر الإعلان، لكن الاسم -l يفترض وجودها، فنتراجع بأمان
      if (t.error) return fail();
    }
    urls.push(publicImageUrl(name));
  }
  return { urls, names };
}

// يحذف الصور مع نسخها المصغّرة (-s) إن وُجدت
export async function removeImages(names: string[]) {
  const all = names.flatMap((n) => (/-l\.webp$/.test(n) ? [n, n.replace(/-l\.webp$/, '-s.webp')] : [n]));
  if (all.length) await supabaseAdmin().storage.from(IMAGE_BUCKET).remove(all);
}
