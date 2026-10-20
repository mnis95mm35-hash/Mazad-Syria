import { NextResponse, type NextRequest } from 'next/server';
import { cronAuthorized } from '@/lib/cron_auth';
import { SITE } from '@/lib/site_config';

export const dynamic = 'force-dynamic';

// يُستدعى مرة واحدة من المتصفح بعد النشر: يربط البوت بالموقع ويضبط أوامره.
// /api/telegram/setup?key=<CRON_SECRET>
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN و TELEGRAM_WEBHOOK_SECRET مطلوبان' }, { status: 400 });

  const call = async (method: string, body: unknown) => {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json()) as { ok?: boolean; description?: string };
    return { ok: Boolean(j.ok), description: j.description ?? '' };
  };

  const webhook = await call('setWebhook', {
    url: `${SITE.url}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });
  const commands = await call('setMyCommands', {
    commands: [
      { command: 'start', description: 'كيف أنشر إعلاني' },
      { command: 'help', description: 'مثال على الإعلان' },
    ],
  });
  return NextResponse.json({ webhook, commands, url: `${SITE.url}/api/telegram/webhook` });
}
