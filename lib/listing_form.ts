import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { CATEGORIES, CITIES } from '@/lib/sample_data';
import { isValidPhone } from '@/lib/phone';
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
};

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
  return {
    fields: {
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
export async function prepareImages(files: File[]): Promise<{ error: string } | { buffers: Buffer[] }> {
  const buffers: Buffer[] = [];
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
    } catch {
      return { error: 'تعذّرت معالجة إحدى الصور. جرّب صورة أخرى.' };
    }
  }
  return { buffers };
}

// يرفع الصور؛ عند أي فشل يحذف ما رُفع ويعيد خطأ
export async function uploadImages(buffers: Buffer[]): Promise<{ error: string } | { urls: string[]; names: string[] }> {
  const storage = supabaseAdmin().storage.from(IMAGE_BUCKET);
  const urls: string[] = [];
  const names: string[] = [];
  for (const buf of buffers) {
    const name = `${randomUUID()}.webp`;
    const { error } = await storage.upload(name, buf, { contentType: 'image/webp', cacheControl: '31536000' });
    if (error) {
      if (names.length) await storage.remove(names);
      return { error: 'تعذّر رفع الصور، حاول مرة أخرى.' };
    }
    names.push(name);
    urls.push(publicImageUrl(name));
  }
  return { urls, names };
}

export async function removeImages(names: string[]) {
  if (names.length) await supabaseAdmin().storage.from(IMAGE_BUCKET).remove(names);
}
