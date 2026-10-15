import { supabaseAdmin } from '@/lib/supabase';
import { listingService } from '@/lib/listing_service';
import { adminUrl, notifyAdmin } from '@/lib/notify';

export const REPORT_REASONS = ['احتيال أو نصب', 'محتوى مخالف', 'إعلان مكرر', 'معلومات أو سعر غير صحيح', 'أخرى'] as const;
// عدد البلاغات المختلفة غير المعالَجة التي تحجب الإعلان تلقائياً إلى أن تراجعه الإدارة
export const AUTO_BLOCK_THRESHOLD = 3;
// نص سبب الحجب التلقائي: به نميّز ما يُعاد عند تجاهل البلاغات
export const AUTO_BLOCK_REASON = 'حُجب مؤقتاً بسبب بلاغات متعددة وينتظر مراجعة الإدارة';

export type OpenReport = {
  id: number;
  listingId: number;
  reason: string;
  details: string | null;
  createdAt: Date;
};

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
    .eq('listing_id', input.listingId)
    .eq('resolved', false);
  const blocked = (count ?? 0) >= AUTO_BLOCK_THRESHOLD;
  if (blocked) {
    const l = await listingService.getListing(input.listingId);
    if (l) await listingService.reject(input.listingId, AUTO_BLOCK_REASON);
  }
  notifyAdmin(
    `🚩 بلاغ على الإعلان #${input.listingId}\nالسبب: ${input.reason}${input.details ? `\n${input.details.slice(0, 200)}` : ''}${blocked ? '\n⛔ حُجب تلقائياً (3 بلاغات)' : ''}\n${adminUrl()}`,
  );
  return true;
}

// عدد البلاغات المفتوحة لكل إعلان
async function countsByListing(): Promise<Record<number, number>> {
  const { data, error } = await supabaseAdmin().from('listing_reports').select('listing_id').eq('resolved', false).limit(10000);
  if (error) throw new Error(error.message);
  const out: Record<number, number> = {};
  for (const r of data as { listing_id: number }[]) out[r.listing_id] = (out[r.listing_id] ?? 0) + 1;
  return out;
}

// البلاغات المفتوحة بتفاصيلها (الأحدث أولاً) للوحة الإدارة
async function listOpen(): Promise<OpenReport[]> {
  const { data, error } = await supabaseAdmin()
    .from('listing_reports')
    .select('id, listing_id, reason, details, created_at')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data as { id: number; listing_id: number; reason: string; details: string | null; created_at: string }[]).map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    reason: r.reason,
    details: r.details,
    createdAt: new Date(r.created_at),
  }));
}

// تعليم كل بلاغات الإعلان كمعالَجة (لا تُحتسب في الحجب التلقائي بعد الآن)
async function resolveForListing(listingId: number): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('listing_reports')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('listing_id', listingId)
    .eq('resolved', false);
  if (error) throw new Error(error.message);
}

export const reports = { report, countsByListing, listOpen, resolveForListing };
