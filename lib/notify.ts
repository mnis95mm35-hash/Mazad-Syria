import { after } from 'next/server';
import { SITE } from '@/lib/site_config';

// إشعار فوري للإدارة عبر بوت تيليجرام. اختياري: بلا المتغيرين التاليين لا يحدث شيء ولا يتعطل الموقع.
//   TELEGRAM_BOT_TOKEN  (من @BotFather)
//   TELEGRAM_CHAT_ID    (رقم محادثتك مع البوت أو مجموعة الإدارة)
export const notifyConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

export async function notifyAdminNow(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3500), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('telegram notify failed', res.status);
    return res.ok;
  } catch (e) {
    // لا نطبع الخطأ كاملاً حتى لا يتسرب الرابط الذي يحوي التوكن
    console.error('telegram notify error', e instanceof Error ? e.name : 'unknown');
    return false;
  }
}

// يرسل بعد انتهاء الاستجابة للمستخدم، فلا يبطّئ طلبه
export function notifyAdmin(text: string): void {
  try {
    after(() => notifyAdminNow(text));
  } catch {
    void notifyAdminNow(text);
  }
}

export const adminUrl = () => `${SITE.url}/admin`;
