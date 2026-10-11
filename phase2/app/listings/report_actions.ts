'use server';

import { listingService } from '@/lib/listing_service';
import { REPORT_REASONS, reports } from '@/lib/reports_service';
import { clientKey, isLimited, recordEvent } from '@/lib/rate_limit';

export type ReportState = { error?: string; message?: string };

export async function reportListingAction(_prev: ReportState, fd: FormData): Promise<ReportState> {
  const id = Number(fd.get('id'));
  const reason = String(fd.get('reason') ?? '');
  const details = String(fd.get('details') ?? '').trim().slice(0, 500);
  if (!Number.isInteger(id)) return { error: 'إعلان غير صالح.' };
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return { error: 'اختر سبب البلاغ.' };
  if (await isLimited('report', [{ max: 5, windowMs: 60 * 60 * 1000 }])) {
    return { error: 'أرسلت بلاغات كثيرة. حاول لاحقاً.' };
  }
  const listing = await listingService.getListing(id);
  if (!listing) return { error: 'الإعلان غير موجود.' };

  await recordEvent('report');
  // نفس الزائر لا يُحتسب إلا مرة واحدة على الإعلان الواحد
  const ok = await reports.report({
    listingId: id,
    reporterKey: await clientKey('report'),
    reason,
    details: details || null,
  });
  return { message: ok ? 'شكراً، وصلنا بلاغك وسنراجعه.' : 'سبق أن أبلغت عن هذا الإعلان.' };
}
