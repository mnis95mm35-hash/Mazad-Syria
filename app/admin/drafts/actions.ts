'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin_auth';
import { drafts, type DraftStatus } from '@/lib/drafts_service';

async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin');
}

function back(msg: string, kind: 'ok' | 'err' = 'ok'): never {
  redirect(`/admin/drafts?${kind}=${encodeURIComponent(msg)}`);
}
const num = (fd: FormData) => Number(fd.get('id'));

export async function addDraftsAction(fd: FormData) {
  await requireAdmin();
  const text = String(fd.get('text') ?? '');
  if (!text.trim()) back('الصق منشوراً واحداً على الأقل.', 'err');
  if (text.length > 200_000) back('النص كبير جداً.', 'err');
  const r = await drafts.addFromText(text, {
    defaultPhone: String(fd.get('defaultPhone') ?? '').trim(),
    defaultName: String(fd.get('defaultName') ?? '').trim(),
  });
  revalidatePath('/admin/drafts');
  back(`أُضيف ${r.added} مسودة، مكرر ${r.duplicates}، متجاوَز ${r.skipped}.`);
}

export async function updateDraftAction(fd: FormData) {
  await requireAdmin();
  await drafts.update(num(fd), {
    title: String(fd.get('title') ?? ''),
    price: String(fd.get('price') ?? ''),
    currency: String(fd.get('currency') ?? ''),
    category: String(fd.get('category') ?? ''),
    city: String(fd.get('city') ?? ''),
    sellerName: String(fd.get('sellerName') ?? ''),
    sellerPhone: String(fd.get('sellerPhone') ?? ''),
  });
  revalidatePath('/admin/drafts');
  back('حُفظت التعديلات.');
}

export async function setDraftStatusAction(fd: FormData) {
  await requireAdmin();
  const status = String(fd.get('status')) as DraftStatus;
  if (!['draft', 'invited', 'claimed', 'rejected'].includes(status)) back('حالة غير صالحة.', 'err');
  await drafts.setStatus(num(fd), status);
  revalidatePath('/admin/drafts');
  back('تم.');
}

export async function deleteDraftAction(fd: FormData) {
  await requireAdmin();
  await drafts.remove(num(fd));
  revalidatePath('/admin/drafts');
  back('حُذفت المسودة.');
}

export async function publishDraftAction(fd: FormData) {
  await requireAdmin();
  if (String(fd.get('consent') ?? '') !== 'yes') back('أكّد أن صاحب الإعلان وافق على نشره.', 'err');
  const r = await drafts.publish(num(fd), String(fd.get('consentNote') ?? ''));
  if ('error' in r) back(r.error, 'err');
  revalidatePath('/');
  revalidatePath('/admin/drafts');
  back('نُشر الإعلان.');
}
