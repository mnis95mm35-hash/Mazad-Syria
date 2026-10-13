'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { isLimited, recordEvent } from '@/lib/rate_limit';
import { orders } from '@/lib/orders_service';
import { dealers } from '@/lib/dealers_service';
import { IMAGE_BUCKET, imagePathFromUrl, supabaseAdmin } from '@/lib/supabase';
import { adminConfigured, checkPassword, endSession, isAdmin, startSession } from '@/lib/admin_auth';

export type LoginState = { error?: string };

const ALLOWED_DAYS = [7, 30, 90];

// كل إجراء إداري يتحقق من الجلسة بنفسه، ولا يعتمد على إخفاء الصفحة فقط
async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin');
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: 'لوحة الإدارة غير مفعّلة بعد.' };
  // 5 محاولات فاشلة كحد أقصى كل 15 دقيقة لكل زائر
  if (await isLimited('admin-login', [{ max: 5, windowMs: 15 * 60 * 1000 }])) {
    return { error: 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً.' };
  }
  const password = String(formData.get('password') ?? '');
  if (!checkPassword(password)) {
    await recordEvent('admin-login');
    // تأخير بسيط يبطّئ محاولات التخمين
    await new Promise((r) => setTimeout(r, 800));
    return { error: 'كلمة المرور غير صحيحة.' };
  }
  await startSession();
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect('/admin');
}

export async function featureListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const days = Number(formData.get('days'));
  if (!Number.isInteger(id) || !ALLOWED_DAYS.includes(days)) return;
  await listingService.setFeatured(id, days);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function unfeatureListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await listingService.setFeatured(id, null);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function setStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));
  if (!Number.isInteger(id) || (status !== 'active' && status !== 'blocked')) return;
  await listingService.setStatus(id, status);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function activateRequestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await orders.activate(id);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function rejectRequestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await orders.reject(id);
  revalidatePath('/admin');
}

export async function renewListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await listingService.renew(id);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  const images = await listingService.deleteListing(id);
  // نحذف فقط الملفات التي تطابق نمط ملفاتنا في حاويتنا
  const paths = images.map(imagePathFromUrl).filter((p): p is string => p !== null);
  if (paths.length) await supabaseAdmin().storage.from(IMAGE_BUCKET).remove(paths);
  revalidatePath('/');
  revalidatePath('/admin');
}

// ===== التجار والاشتراكات =====

export async function activatePlanRequestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await dealers.activateRequest(id);
  revalidatePath('/dealers');
  revalidatePath('/admin');
}

export async function rejectPlanRequestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await dealers.rejectRequest(id);
  revalidatePath('/admin');
}

export async function setDealerVerifiedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await dealers.setVerified(id, formData.get('verified') === '1');
  revalidatePath('/dealers');
  revalidatePath('/admin');
}

export async function setDealerStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));
  if (!Number.isInteger(id) || (status !== 'active' && status !== 'suspended')) return;
  await dealers.setStatus(id, status);
  revalidatePath('/dealers');
  revalidatePath('/admin');
}

// مراجعة الإعلانات الجديدة: القبول يفعّل الإعلان ويبدأ مدته من الآن، والرفض يحظره
export async function approveListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await listingService.renew(id);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function rejectListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await listingService.setStatus(id, 'blocked');
  revalidatePath('/admin');
}
