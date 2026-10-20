'use server';

import { getCurrentUser } from '@/lib/supabase_auth';
import { isLimited, recordEvent } from '@/lib/rate_limit';
import { listingService } from '@/lib/listing_service';
import { drafts } from '@/lib/drafts_service';
import { listingLimitError } from '@/lib/limits';
import { isTrustedOwner } from '@/lib/trust';
import { adminUrl, notifyAdmin } from '@/lib/notify';
import { turnstileError } from '@/lib/turnstile';
import { MAX_IMAGES, filesFrom, parseListingFields, prepareImages, removeImages, uploadImages } from '@/lib/listing_form';

export type QuickState = { error?: string; done?: 'published' | 'review'; id?: number };

const RULES = [
  { max: 3, windowMs: 60 * 60 * 1000 },
  { max: 10, windowMs: 24 * 60 * 60 * 1000 },
];

// نشر سريع من الأداة العائمة. المسجّل الموثوق ينشر فوراً، والمسجّل العادي ينتظر المراجعة (كالنموذج العادي)،
// والزائر غير المسجّل تُحفظ إعلانه كمسودة تراجعها الإدارة وتتأكد من صاحبها عبر واتساب.
export async function quickPostAction(_prev: QuickState, fd: FormData): Promise<QuickState> {
  if (String(fd.get('website') ?? '').trim()) return { done: 'review' };
  if (String(fd.get('consent') ?? '') !== 'yes') return { error: 'أكّد أن الإعلان لك أو أنك مفوَّض بنشره.' };

  const parsed = parseListingFields(fd);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.fields;
  if (!(f.price > 0)) return { error: 'السعر مطلوب (أكبر من صفر).' };

  const captcha = await turnstileError(fd);
  if (captcha) return { error: captcha };

  const files = filesFrom(fd);
  if (files.length > MAX_IMAGES) return { error: `الحد الأقصى ${MAX_IMAGES} صور.` };
  if (await isLimited('quick', RULES)) return { error: 'أرسلت عدداً كبيراً من الإعلانات في وقت قصير. حاول لاحقاً.' };

  const user = await getCurrentUser();
  if (user) {
    const limitError = await listingLimitError(user.id);
    if (limitError) return { error: limitError };
  }

  const prepared = await prepareImages(files);
  if ('error' in prepared) return { error: prepared.error };
  await recordEvent('quick');
  const up = await uploadImages(prepared.buffers, prepared.thumbs);
  if ('error' in up) return { error: up.error };

  try {
    if (user) {
      const trusted = await isTrustedOwner(user.id).catch(() => false);
      const id = await listingService.createListing({ ...f, images: up.urls, userId: user.id, status: trusted ? 'active' : 'pending' });
      if (!trusted) notifyAdmin(`🆕 إعلان بانتظار المراجعة (أداة النشر السريع): ${f.title}\n${adminUrl()}`);
      return { done: trusted ? 'published' : 'review', id: trusted ? id : undefined };
    }
    const r = await drafts.addValidated(f, up.urls, 'الأداة العائمة: زائر أرسل الإعلان بنفسه وأقرّ بحقه في نشره (الهاتف غير موثّق بعد)');
    if ('duplicate' in r) {
      await removeImages(up.names);
      return { error: 'وصلنا إعلان مماثل من قبل، وهو قيد المراجعة.' };
    }
    notifyAdmin(`🆕 مسودة من الأداة العائمة: ${f.title}\n${adminUrl()}/drafts`);
    return { done: 'review' };
  } catch (e) {
    await removeImages(up.names);
    console.error('quickPost failed', e);
    return { error: 'تعذّر حفظ الإعلان، حاول مرة أخرى.' };
  }
}
