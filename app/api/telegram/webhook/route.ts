import { NextResponse, type NextRequest } from 'next/server';
import { handleMessage, secretOk, type TgMessage } from '@/lib/telegram_intake';
import { runLogged } from '@/lib/job_log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// تلغرام يرسل كل رسالة هنا. الترويسة السرية تضمن أن الطلب منه فعلاً.
export async function POST(req: NextRequest) {
  if (!secretOk(req.headers.get('x-telegram-bot-api-secret-token'))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let update: { message?: TgMessage };
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (update.message) {
    try {
      await handleMessage(update.message);
    } catch (e) {
      // نرجع 200 دائماً حتى لا يعيد تلغرام إرسال نفس الرسالة بلا نهاية
      console.error('telegram intake error', e instanceof Error ? e.message : 'unknown');
      await runLogged('telegram-intake', async () => {
        throw e;
      }).catch(() => undefined);
    }
  }
  return NextResponse.json({ ok: true });
}
