import { NextResponse, type NextRequest } from 'next/server';
import { cronAuthorized } from '@/lib/cron_auth';
import { runLogged } from '@/lib/job_log';
import { drafts } from '@/lib/drafts_service';

export const dynamic = 'force-dynamic';

// يحذف المسودات التي لم يطالب بها أصحابها خلال 14 يوماً (حمايةً لبياناتهم). يُستدعى يومياً.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await runLogged('drafts-cleanup', async () => ({ deleted: await drafts.purgeExpired() }));
  return NextResponse.json({ ok: true, ...result });
}
