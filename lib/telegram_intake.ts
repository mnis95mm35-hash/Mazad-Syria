import { createHash } from 'crypto';
import { drafts } from '@/lib/drafts_service';
import { prepareImages, uploadImages, removeImages } from '@/lib/listing_form';
import { notifyAdminNow, adminUrl } from '@/lib/notify';
import { SITE } from '@/lib/site_config';

const MAX_IMAGES = 5;
const DAILY_LIMIT = 30;
const ATTACH_WINDOW_MS = 10 * 60 * 1000;

type TgPhoto = { file_id: string; file_size?: number };
export type TgMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
  caption?: string;
  photo?: TgPhoto[];
  document?: { file_id: string; mime_type?: string; file_size?: number };
};

const WELCOME =
  `أهلاً بك في مزاد سوريا 👋\n\n` +
  `أرسل لي إعلانك كما تكتبه عادةً في رسالة واحدة: ماذا تبيع، السعر، المدينة والمنطقة، ورقم هاتفك.\n` +
  `ثم أرسل الصور (حتى ${MAX_IMAGES}) بعد الرسالة مباشرة.\n\n` +
  `يمكنك إرسال عدة إعلانات، كل إعلان في رسالة.\n\n` +
  `بإرسالك الإعلان توافق على نشره في موقع مزاد سوريا (${SITE.url}). ` +
  `تراجعه الإدارة قبل النشر وقد تتواصل معك للتأكد. النشر مجاني.`;

const HELP =
  `طريقة الإرسال:\n1) رسالة نصية فيها: المنتج، السعر، المدينة والمنطقة، رقم الهاتف.\n2) ثم الصور.\n\nمثال:\nللبيع شقة 110 م² غرفتين في طرطوس دوير الشيخ سعد، السعر 45000$، للتواصل 09XXXXXXXX`;

function token(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

export async function tgSend(chatId: number, text: string): Promise<void> {
  const t = token();
  if (!t) return;
  try {
    await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3500), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error('telegram send error', e instanceof Error ? e.name : 'unknown');
  }
}

// ننزّل الصورة من تلغرام (حد 5 ميغابايت) دون كشف رابط التنزيل الذي يحوي التوكن في السجلات
async function download(fileId: string): Promise<File | null> {
  const t = token();
  if (!t) return null;
  try {
    const meta = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${encodeURIComponent(fileId)}`, { signal: AbortSignal.timeout(8000) });
    const j = (await meta.json()) as { ok?: boolean; result?: { file_path?: string; file_size?: number } };
    const path = j.result?.file_path;
    if (!j.ok || !path || (j.result?.file_size ?? 0) > 5 * 1024 * 1024) return null;
    const res = await fetch(`https://api.telegram.org/file/bot${t}/${path}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new File([buf], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    return null;
  }
}

function who(m: TgMessage): string {
  const u = m.from?.username ? `@${m.from.username}` : (m.from?.first_name ?? 'مجهول');
  return `${u} ${drafts.chatTag(m.chat.id)}`;
}

function fmtPrice(p: number | null) {
  return p === null ? 'غير مذكور' : String(p);
}

export async function handleMessage(m: TgMessage): Promise<void> {
  // نعمل في المحادثات الخاصة فقط
  if (m.chat.type !== 'private') return;
  const chatId = m.chat.id;
  const text = (m.text ?? '').trim();

  if (text === '/start') return tgSend(chatId, WELCOME);
  if (text === '/help') return tgSend(chatId, HELP);

  // صور: تُرفق بآخر إعلان أرسله هذا المستخدم خلال 10 دقائق
  const photo = m.photo && m.photo.length > 0 ? m.photo[m.photo.length - 1] : null;
  const imgDoc = m.document && (m.document.mime_type ?? '').startsWith('image/') ? m.document : null;
  const fileId = photo?.file_id ?? imgDoc?.file_id;
  const body = (m.caption ?? text).trim();

  if (!fileId && !body) return tgSend(chatId, 'أرسل نص الإعلان أو صوره. اكتب /help للمثال.');

  // نص (أو وصف صورة) → إعلان جديد
  let target = null as Awaited<ReturnType<typeof drafts.latestForChat>>;
  if (body && body.length >= 15) {
    if ((await drafts.countForChatToday(chatId)) >= DAILY_LIMIT) {
      return tgSend(chatId, 'وصلت إلى الحد اليومي من الإعلانات. حاول غداً أو تواصل معنا.');
    }
    if (body.length > 5000) return tgSend(chatId, 'الرسالة طويلة جداً. اختصرها وأرسلها مجدداً.');
    const r = await drafts.addFromText(body, {
      intake: { note: `تلغرام ${who(m)}: أرسل الإعلان بنفسه ووافق على النشر` },
    });
    if (r.added === 0) {
      return tgSend(chatId, r.duplicates > 0 ? 'هذا الإعلان وصلنا من قبل 👍' : 'لم أفهم الرسالة كإعلان. اكتب /help للمثال.');
    }
    const first = r.items[0];
    const warn: string[] = [];
    if (first.price === null) warn.push('السعر');
    if (!first.city) warn.push('المدينة');
    if (!first.phone) warn.push('رقم الهاتف');
    await tgSend(
      chatId,
      `✅ استلمنا إعلانك: ${first.title}\nالسعر: ${fmtPrice(first.price)}\nالمدينة: ${first.city ?? 'غير محددة'}` +
        (warn.length ? `\n\n⚠️ ينقصه: ${warn.join('، ')}. أرسل الإعلان كاملاً من جديد وسنستبدله.` : '') +
        (fileId ? '' : `\n\nيمكنك الآن إرسال الصور (حتى ${MAX_IMAGES}).`),
    );
    void notifyAdminNow(`📥 مسودة جديدة من تلغرام: ${first.title}\n${adminUrl()}/drafts`);
    target = await drafts.latestForChat(chatId, ATTACH_WINDOW_MS);
    if (!fileId) return;
  } else if (fileId) {
    target = await drafts.latestForChat(chatId, ATTACH_WINDOW_MS);
  } else {
    return tgSend(chatId, 'الرسالة قصيرة جداً. اكتب تفاصيل الإعلان: المنتج والسعر والمدينة والهاتف.');
  }

  if (!fileId) return;
  if (!target) return tgSend(chatId, 'أرسل نص الإعلان أولاً، ثم الصور بعده مباشرة.');
  if (target.images.length >= MAX_IMAGES) return tgSend(chatId, `الحد الأقصى ${MAX_IMAGES} صور لكل إعلان.`);

  const file = await download(fileId);
  if (!file) return tgSend(chatId, 'تعذّر تنزيل الصورة، أعد إرسالها.');
  const prepared = await prepareImages([file]);
  if ('error' in prepared) return tgSend(chatId, prepared.error);
  const up = await uploadImages(prepared.buffers, prepared.thumbs);
  if ('error' in up) return tgSend(chatId, up.error);
  try {
    await drafts.appendImages(target.id, up.urls);
  } catch {
    await removeImages(up.names);
    return tgSend(chatId, 'تعذّر حفظ الصورة، أعد المحاولة.');
  }
  // لا نرد على كل صورة في الألبوم: رد واحد عند الصورة الأولى فقط
  if (target.images.length === 0) await tgSend(chatId, '📷 وصلتنا الصورة. أرسل ما تبقى منها إن وُجد، وسنراجع الإعلان قريباً.');
}

// مقارنة بزمن ثابت لترويسة سرّ الويب هوك
export function secretOk(given: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(secret).digest();
  return a.equals(b);
}
