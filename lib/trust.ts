import { dealers, liveOrNull } from '@/lib/dealers_service';
import { listingService } from '@/lib/listing_service';

// الإعلان ينشر فوراً فقط إن كان صاحبه موثوقاً: تاجر باشتراك ساري، أو مستخدم له إعلانان مقبولان
// على الأقل بلا أي إعلان محظور. غير ذلك يمر بمراجعة الإدارة أولاً.
export async function isTrustedOwner(userId: string): Promise<boolean> {
  if (liveOrNull(await dealers.getByUser(userId))) return true;
  const h = await listingService.ownerHistory(userId);
  return h.blocked === 0 && h.good >= 2;
}
