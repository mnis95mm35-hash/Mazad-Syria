'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { getCurrentUser } from '@/lib/supabase_auth';
import { isLimited, recordEvent } from '@/lib/rate_limit';
import { imagePathFromUrl } from '@/lib/supabase';
import { MAX_IMAGES, filesFrom, parseListingFields, prepareImages, removeImages, uploadImages } from '@/lib/listing_form';

export type FormState = { error?: string };

const POST_RULES = [
  { max: 5, windowMs: 60 * 60 * 1000 },
  { max: 15, windowMs: 24 * 60 * 60 * 1000 },
];

export async function createListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // حقل مخفي لا يراه البشر: إن امتلأ فهو روبوت. نتظاهر بالنجاح دون حفظ شيء.
  if (String(formData.get('website') ?? '').trim()) redirect('/');

  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/listings/new');

  const parsed = parseListingFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const files = filesFrom(formData);
  if (files.length > MAX_IMAGES) return { error: `الحد الأقصى ${MAX_IMAGES} صور لكل إعلان.` };

  if (await isLimited('post', POST_RULES)) {
    return { error: 'أرسلت عدداً كبيراً من الإعلانات في وقت قصير. حاول لاحقاً.' };
  }

  const prepared = await prepareImages(files);
  if ('error' in prepared) return { error: prepared.error };

  await recordEvent('post');
  const uploaded = await uploadImages(prepared.buffers);
  if ('error' in uploaded) return { error: uploaded.error };

  let id: number;
  try {
    id = await listingService.createListing({ ...parsed.fields, images: uploaded.urls, userId: user.id });
  } catch (e) {
    // لا نترك صوراً يتيمة إن فشل حفظ الإعلان
    await removeImages(uploaded.names);
    console.error('createListing failed', e);
    return { error: 'تعذّر حفظ الإعلان، حاول مرة أخرى.' };
  }

  revalidatePath('/');
  redirect(`/listings/${id}`);
}

export async function updateListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return { error: 'إعلان غير صالح.' };
  const existing = await listingService.getListing(id, { includeInactive: true });
  // الإعلان يجب أن يكون ملكاً للمستخدم الحالي، ولا نعدّل ما حظرته الإدارة
  if (!existing || existing.userId !== user.id) return { error: 'لا يمكنك تعديل هذا الإعلان.' };
  if (existing.status === 'blocked') return { error: 'هذا الإعلان محظور من الإدارة ولا يمكن تعديله.' };

  const parsed = parseListingFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const oldImages = existing.images ?? [];
  // نبقي فقط الصور الموجودة فعلاً في الإعلان، بترتيبها
  const keep = new Set(formData.getAll('keep').map(String));
  const kept = oldImages.filter((u) => keep.has(u));
  const files = filesFrom(formData);
  if (kept.length + files.length > MAX_IMAGES) return { error: `الحد الأقصى ${MAX_IMAGES} صور لكل إعلان.` };

  const prepared = await prepareImages(files);
  if ('error' in prepared) return { error: prepared.error };
  const uploaded = await uploadImages(prepared.buffers);
  if ('error' in uploaded) return { error: uploaded.error };

  try {
    await listingService.updateListing(id, { ...parsed.fields, images: [...kept, ...uploaded.urls] });
  } catch (e) {
    await removeImages(uploaded.names);
    console.error('updateListing failed', e);
    return { error: 'تعذّر حفظ التعديلات، حاول مرة أخرى.' };
  }

  // نحذف من التخزين الصور التي أزالها المستخدم
  const removed = oldImages.filter((u) => !keep.has(u)).map(imagePathFromUrl).filter((p): p is string => p !== null);
  await removeImages(removed);

  revalidatePath('/');
  revalidatePath(`/listings/${id}`);
  redirect('/account');
}
