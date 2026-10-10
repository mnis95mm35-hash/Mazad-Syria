'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { CATEGORIES, CITIES } from '@/lib/sample_data';

export type FormState = { error?: string };

export async function createListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const price = Number(formData.get('price'));
  const category = String(formData.get('category') ?? '');
  const city = String(formData.get('city') ?? '');
  const sellerName = String(formData.get('sellerName') ?? '').trim();
  const sellerPhone = String(formData.get('sellerPhone') ?? '').trim();

  if (title.length < 3) return { error: 'العنوان قصير جداً (3 أحرف على الأقل).' };
  if (title.length > 120) return { error: 'العنوان طويل جداً.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'السعر غير صالح.' };
  if (!CATEGORIES.some((c) => c.slug === category)) return { error: 'اختر قسماً من القائمة.' };
  if (!CITIES.includes(city)) return { error: 'اختر مدينة من القائمة.' };
  if (sellerName.length < 2) return { error: 'أدخل اسمك.' };
  if (sellerPhone && !/^[0-9+\s-]{6,20}$/.test(sellerPhone)) return { error: 'رقم الهاتف غير صالح.' };

  const id = await listingService.createListing({
    title,
    description: description || null,
    price,
    category,
    city,
    sellerName,
    sellerPhone: sellerPhone || null,
  });

  revalidatePath('/');
  redirect(`/listings/${id}`);
}
