import { supabaseAdmin } from '@/lib/supabase';
import { listingService } from '@/lib/listing_service';

export const REPORT_REASONS = ['احتيال أو نصب', 'محتوى مخالف', 'إعلان مكرر', 'معلومات أو سعر غير صحيح', 'أخرى'] as const;
// عدد البلاغات المختلفة التي تحجب الإعلان تلقائياً إلى أن تراجعه الإدارة
export const AUTO_BLOCK_THRESHOLD = 3;

// يعيد false إن كان الزائر قد أبلغ عن هذا الإعلان من قبل
async function report(input: { listingId: number; reporterKey: string; reason: string; details: string | null }) {
  const db = supabaseAdmin();
  const { error } = await db.from('listing_reports').insert({
    listing_id: input.listingId,
    reporter_key: input.reporterKey,
    reason: input.reason,
    details: input.details,
  });
  if (error) {
    if (error.code === '23505') return false;
    throw new Error(error.message);
  }
  const { count } = await db
    .from('listing_reports')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', input.listingId);
  if ((count ?? 0) >= AUTO_BLOCK_THRESHOLD) {
    const l = await listingService.getListing(input.listingId);
    if (l) await listingService.setStatus(input.listingId, 'blocked');
  }
  return true;
}

async function countsByListing(): Promise<Record<number, number>> {
  const { data, error } = await supabaseAdmin().from('listing_reports').select('listing_id').limit(10000);
  if (error) throw new Error(error.message);
  const out: Record<number, number> = {};
  for (const r of data as { listing_id: number }[]) out[r.listing_id] = (out[r.listing_id] ?? 0) + 1;
  return out;
}

export const reports = { report, countsByListing };
