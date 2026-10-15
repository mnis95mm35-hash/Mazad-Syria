import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { listingService } from '@/lib/listing_service';
import { adminUrl, notifyAdminNow } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? req.nextUrl.searchParams.get('key') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// يُستدعى من خدمة مجدولة مجانية (مثل cron-job.org) كل بضع ساعات، فيذكّرك بالإعلانات المنتظرة
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const pending = await listingService.getPending();
  if (pending.length === 0) return NextResponse.json({ ok: true, pending: 0 });
  const oldest = pending[0];
  const hours = Math.max(Math.floor((Date.now() - oldest.createdAt.getTime()) / 3_600_000), 0);
  const sent = await notifyAdminNow(
    `⏰ ${pending.length} إعلان بانتظار المراجعة، وأقدمها منذ ${hours} ساعة.\n${adminUrl()}`,
  );
  return NextResponse.json({ ok: true, pending: pending.length, notified: sent });
}
