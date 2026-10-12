import { dealers, isLive, listingLimit } from '@/lib/dealers_service';
import { listingService } from '@/lib/listing_service';

// يتحقق أن المستخدم يستطيع إضافة/تفعيل إعلان آخر ضمن حد باقته. يعيد رسالة خطأ أو null
export async function listingLimitError(userId: string): Promise<string | null> {
  const dealer = await dealers.getByUser(userId);
  const limit = listingLimit(dealer);
  const active = await listingService.countActiveByOwner(userId);
  if (active < limit) return null;
  return isLive(dealer)
    ? `وصلت للحد الأقصى لباقتك (${limit} إعلاناً فعّالاً). أخفِ إعلاناً قديماً أو ارفع باقتك.`
    : `وصلت للحد الأقصى (${limit} إعلانات فعّالة). اشترك كتاجر لرفع الحد من صفحة «حساب التاجر».`;
}

export async function usageFor(userId: string) {
  const dealer = await dealers.getByUser(userId);
  const active = await listingService.countActiveByOwner(userId);
  return { dealer, active, limit: listingLimit(dealer) };
}
