'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { listingService } from '@/lib/listing_service';
import { adminConfigured, checkPassword, endSession, isAdmin, startSession } from '@/lib/admin_auth';

export type LoginState = { error?: string };

const ALLOWED_DAYS = [7, 30, 90];
const IMAGE_URL_RE = /^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

// كل إجراء إداري يتحقق من الجلسة بنفسه، ولا يعتمد على إخفاء الصفحة فقط
async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin');
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: 'لوحة الإدارة غير مفعّلة بعد.' };
  const password = String(formData.get('password') ?? '');
  if (!checkPassword(password)) {
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

export async function deleteListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  const images = await listingService.deleteListing(id);
  for (const url of images) {
    // نحذف فقط الملفات التي تطابق نمط ملفاتنا المرفوعة
    if (IMAGE_URL_RE.test(url)) {
      await fs.unlink(path.join(process.cwd(), 'public', url)).catch(() => {});
    }
  }
  revalidatePath('/');
  revalidatePath('/admin');
}
