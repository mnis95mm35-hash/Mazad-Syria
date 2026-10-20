import { NextResponse, type NextRequest } from 'next/server';
import { listingService } from '@/lib/listing_service';
import { adminUrl, notifyAdminNow } from '@/lib/notify';
import { cronAuthorized } from '@/lib/cron_auth';
import { runLogged } from '@/lib/job_log';

export const dynamic = 'force-dynamic';

// يُستدعى من خدمة مجدولة مجانية (مثل cron-job.org) كل بضع ساعات، فيذكّرك بالإعلانات المنتظرة
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await runLogged('review-reminder', async () => {
    const pending = await listingService.getPending();
    if (pending.length === 0) return { ok: true, pending: 0 };
    const oldest = pending[0];
    const hours = Math.max(Math.floor((Date.now() - oldest.createdAt.getTime()) / 3_600_000), 0);
    const sent = await notifyAdminNow(
      `⏰ ${pending.length} إعلان بانتظار المراجعة، وأقدمها منذ ${hours} ساعة.\n${adminUrl()}`,
    );
    return { ok: true, pending: pending.length, notified: sent };
  });
  return NextResponse.json(result);
}
