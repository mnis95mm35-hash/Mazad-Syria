'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { CATEGORIES, CITIES } from '@/lib/sample_data';

export type FormState = { error?: string };

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// نتحقق من محتوى الملف الفعلي وليس من اسمه أو نوعه المُعلن فقط
function detectImageExt(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

async function saveImage(file: File): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { error: 'حجم الصورة كبير (الحد الأقصى 3 ميغابايت).' };
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExt(buf);
  if (!ext) return { error: 'نوع الصورة غير مدعوم (JPG أو PNG أو WEBP فقط).' };

  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, name), buf);
  return { url: `/uploads/${name}` };
}

export async function createListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const price = Number(formData.get('price'));
  const category = String(formData.get('category') ?? '');
  const city = String(formData.get('city') ?? '');
  const sellerName = String(formData.get('sellerName') ?? '').trim();
  const sellerPhone = String(formData.get('sellerPhone') ?? '').trim();
  const image = formData.get('image');

  if (title.length < 3) return { error: 'العنوان قصير جداً (3 أحرف على الأقل).' };
  if (title.length > 120) return { error: 'العنوان طويل جداً.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'السعر غير صالح.' };
  if (!CATEGORIES.some((c) => c.slug === category)) return { error: 'اختر قسماً من القائمة.' };
  if (!CITIES.includes(city)) return { error: 'اختر مدينة من القائمة.' };
  if (sellerName.length < 2) return { error: 'أدخل اسمك.' };
  if (sellerPhone && !/^[0-9+\s-]{6,20}$/.test(sellerPhone)) return { error: 'رقم الهاتف غير صالح.' };

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    const saved = await saveImage(image);
    if (saved.error) return { error: saved.error };
    imageUrl = saved.url ?? null;
  }

  const id = await listingService.createListing({
    title,
    description: description || null,
    price,
    category,
    city,
    imageUrl,
    sellerName,
    sellerPhone: sellerPhone || null,
  });

  revalidatePath('/');
  redirect(`/listings/${id}`);
}
