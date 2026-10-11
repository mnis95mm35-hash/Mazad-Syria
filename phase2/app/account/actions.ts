'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { orders } from '@/lib/orders_service';
import { getCurrentUser } from '@/lib/supabase_auth';
import { isLimited, recordEvent } from '@/lib/rate_limit';
import { imagePathFromUrl } from '@/lib/supabase';
import { removeImages } from '@/lib/listing_form';
import { featurePrice } from '@/lib/site_config';

// يعيد الإعلان فقط إن كان ملكاً للمستخدم الحالي
async function ownListing(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return null;
  const l = await listingService.getListing(id, { includeInactive: true });
  return l && l.userId === user.id ? { user, listing: l } : null;
}

function refresh() {
  revalidatePath('/');
  revalidatePath('/account');
}

export async function deleteMyListingAction(formData: FormData): Promise<void> {
  const own = await ownListing(formData);
  if (!own) return;
  const images = await listingService.deleteListing(own.listing.id);
  await removeImages(images.map(imagePathFromUrl).filter((p): p is string => p !== null));
  refresh();
}

export async function renewMyListingAction(formData: FormData): Promise<void> {
  const own = await ownListing(formData);
  if (!own || own.listing.status === 'blocked') return;
  await listingService.renew(own.listing.id);
  refresh();
}

// إخفاء/إظهار من صاحب الإعلان (المحظور من الإدارة لا يستطيع إظهاره)
export async function toggleMyListingAction(formData: FormData): Promise<void> {
  const own = await ownListing(formData);
  if (!own || own.listing.status === 'blocked') return;
  await listingService.setStatus(own.listing.id, own.listing.status === 'hidden' ? 'active' : 'hidden');
  refresh();
}

export async function requestFeatureAction(formData: FormData): Promise<void> {
  const own = await ownListing(formData);
  if (!own || own.listing.status !== 'active') return;
  const days = Number(formData.get('days'));
  const amount = featurePrice(days);
  if (amount === null) return;
  if (await isLimited('feature-request', [{ max: 10, windowMs: 24 * 60 * 60 * 1000 }])) return;
  if (await orders.hasPending(own.listing.id)) return;
  await recordEvent('feature-request');
  await orders.create({ listingId: own.listing.id, userId: own.user.id, days, amount });
  refresh();
}
