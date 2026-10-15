'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { dealers } from '@/lib/dealers_service';
import { parseDealerFields } from '@/lib/dealer_form';
import { prepareImages, removeImages, uploadImages } from '@/lib/listing_form';
import { getCurrentUser } from '@/lib/supabase_auth';
import { isLimited, recordEvent } from '@/lib/rate_limit';
import { imagePathFromUrl } from '@/lib/supabase';
import { dealerPrice, isDealerPlan } from '@/lib/site_config';
import { adminUrl, notifyAdmin } from '@/lib/notify';

export type DealerFormState = { error?: string };

const DAY = 24 * 60 * 60 * 1000;

function logoFile(fd: FormData): File | null {
  const f = fd.get('logo');
  return f instanceof File && f.size > 0 ? f : null;
}

// إنشاء حساب تاجر (مع طلب اشتراك أول) أو تعديل بياناته
export async function saveDealerAction(_prev: DealerFormState, formData: FormData): Promise<DealerFormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account/dealer');

  const existing = await dealers.getByUser(user.id);
  const parsed = parseDealerFields(formData, { needSlug: !existing });
  if ('error' in parsed) return { error: parsed.error };

  if (await isLimited('dealer-save', [{ max: 10, windowMs: DAY }])) {
    return { error: 'محاولات كثيرة اليوم. حاول لاحقاً.' };
  }

  let plan = existing?.plan;
  let months = 0;
  if (!existing) {
    const p = formData.get('plan');
    months = Number(formData.get('months'));
    if (!isDealerPlan(p) || dealerPrice(p, months) === null) return { error: 'اختر الباقة ومدة الاشتراك.' };
    plan = p;
    if (await dealers.slugTaken(parsed.fields.slug)) return { error: 'هذا الرابط مستخدم، اختر رابطاً آخر.' };
  }

  // الشعار اختياري: نعالجه كأي صورة (تحقق + تصغير + إزالة EXIF)
  let newLogo: { url: string; name: string } | null = null;
  const file = logoFile(formData);
  if (file) {
    const prepared = await prepareImages([file]);
    if ('error' in prepared) return { error: prepared.error };
    const uploaded = await uploadImages(prepared.buffers);
    if ('error' in uploaded) return { error: uploaded.error };
    newLogo = { url: uploaded.urls[0], name: uploaded.names[0] };
  }
  const dropLogo = formData.get('removeLogo') === 'on';
  const oldLogo = existing?.logoUrl ?? null;
  const logoUrl = newLogo ? newLogo.url : dropLogo ? null : oldLogo;

  await recordEvent('dealer-save');
  try {
    if (existing) {
      // الرابط ثابت بعد الإنشاء كي لا تنكسر الروابط المفهرسة
      await dealers.update(existing.id, { ...parsed.fields, slug: existing.slug, logoUrl });
    } else {
      const dealer = await dealers.create(user.id, { ...parsed.fields, logoUrl }, plan!);
      await dealers.createRequest({ dealerId: dealer.id, userId: user.id, plan: plan!, months });
      notifyAdmin(`🏪 تاجر جديد بانتظار الدفع: ${dealer.name}\n${adminUrl()}`);
    }
  } catch (e) {
    if (newLogo) await removeImages([newLogo.name]);
    console.error('saveDealer failed', e);
    return { error: 'تعذّر حفظ البيانات، حاول مرة أخرى.' };
  }

  if (oldLogo && oldLogo !== logoUrl) {
    const p = imagePathFromUrl(oldLogo);
    if (p) await removeImages([p]);
  }
  revalidatePath('/account/dealer');
  revalidatePath('/dealers');
  if (existing) revalidatePath(`/dealer/${existing.slug}`);
  redirect('/account/dealer');
}

// طلب تجديد أو ترقية لتاجر موجود
export async function requestPlanAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account/dealer');
  const dealer = await dealers.getByUser(user.id);
  if (!dealer || dealer.status === 'suspended') return;

  const plan = formData.get('plan');
  const months = Number(formData.get('months'));
  if (!isDealerPlan(plan) || dealerPrice(plan, months) === null) return;
  if (await isLimited('plan-request', [{ max: 10, windowMs: DAY }])) return;
  if (await dealers.hasPendingRequest(dealer.id)) return;

  await recordEvent('plan-request');
  await dealers.createRequest({ dealerId: dealer.id, userId: user.id, plan, months });
  notifyAdmin(`🏪 طلب اشتراك تاجر: ${dealer.name} (${months} شهراً)\n${adminUrl()}`);
  revalidatePath('/account/dealer');
}
