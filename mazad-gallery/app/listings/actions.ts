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
const MAX_IMAGES = 5;

// نتحقق من محتوى الملف الفعلي وليس من اسمه أو نوعه المُعلن فقط
function detectImageExt(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

type Prepared = { buf: Buffer; ext: 'jpg' | 'png' | 'webp' };

async function prepareImage(file: File): Promise<Prepared | { error: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { error: 'حجم إحدى الصور كبير (الحد الأقصى 3 ميغابايت للصورة).' };
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExt(buf);
  if (!ext) return { error: 'نوع إحدى الصور غير مدعوم (JPG أو PNG أو WEBP فقط).' };
  return { buf, ext };
}

export async function createListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const price = Number(formData.get('price'));
  const category = String(formData.get('category') ?? '');
  const city = String(formData.get('city') ?? '');
  const sellerName = String(formData.get('sellerName') ?? '').trim();
  const sellerPhone = String(formData.get('sellerPhone') ?? '').trim();
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);

  if (title.length < 3) return { error: 'العنوان قصير جداً (3 أحرف على الأقل).' };
  if (title.length > 120) return { error: 'العنوان طويل جداً.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'السعر غير صالح.' };
  if (!CATEGORIES.some((c) => c.slug === category)) return { error: 'اختر قسماً من القائمة.' };
  if (!CITIES.includes(city)) return { error: 'اختر مدينة من القائمة.' };
  if (sellerName.length < 2) return { error: 'أدخل اسمك.' };
  if (sellerPhone && !/^[0-9+\s-]{6,20}$/.test(sellerPhone)) return { error: 'رقم الهاتف غير صالح.' };
  if (files.length > MAX_IMAGES) return { error: `الحد الأقصى ${MAX_IMAGES} صور لكل إعلان.` };

  // نتحقق من كل الصور أولاً، ثم نكتبها، حتى لا نترك ملفات يتيمة عند الفشل
  const prepared: Prepared[] = [];
  for (const f of files) {
    const p = await prepareImage(f);
    if ('error' in p) return { error: p.error };
    prepared.push(p);
  }

  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  const images: string[] = [];
  for (const p of prepared) {
    const name = `${randomUUID()}.${p.ext}`;
    await fs.writeFile(path.join(dir, name), p.buf);
    images.push(`/uploads/${name}`);
  }

  const id = await listingService.createListing({
    title,
    description: description || null,
    price,
    category,
    city,
    images,
    sellerName,
    sellerPhone: sellerPhone || null,
  });

  revalidatePath('/');
  redirect(`/listings/${id}`);
}
