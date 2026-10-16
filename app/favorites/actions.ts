'use server';

import { revalidatePath } from 'next/cache';
import { favorites } from '@/lib/favorites_service';
import { listingService } from '@/lib/listing_service';
import { getCurrentUser } from '@/lib/supabase_auth';
import { isLimited, recordEvent } from '@/lib/rate_limit';

export type FavResult = { ok: boolean; fav?: boolean; needLogin?: boolean; error?: string };

export async function toggleFavoriteAction(listingId: number): Promise<FavResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needLogin: true };
  if (!Number.isInteger(listingId) || listingId < 1) return { ok: false, error: 'إعلان غير صالح.' };
  if (await isLimited('favorite', [{ max: 120, windowMs: 60 * 60 * 1000 }])) {
    return { ok: false, error: 'عمليات كثيرة، حاول لاحقاً.' };
  }
  await recordEvent('favorite');
  // لا نضيف إعلاناً غير موجود (الإزالة مسموحة دائماً)
  const current = await favorites.listIds(user.id);
  if (!current.includes(listingId)) {
    const l = await listingService.getListing(listingId);
    if (!l) return { ok: false, error: 'الإعلان غير موجود.' };
  }
  const fav = await favorites.toggle(user.id, listingId);
  if (fav === null) return { ok: false, error: 'وصلت للحد الأقصى من المفضلة. أزل بعضها أولاً.' };
  revalidatePath('/favorites');
  return { ok: true, fav };
}
