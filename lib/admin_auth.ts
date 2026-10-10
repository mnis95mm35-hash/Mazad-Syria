import { cookies } from 'next/headers';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

const COOKIE = 'mz_admin';
const SESSION_MS = 8 * 60 * 60 * 1000;

// تتطلب لوحة الإدارة متغيّرين في .env.local:
// ADMIN_PASSWORD و ADMIN_SESSION_SECRET (نص عشوائي طويل ومختلف عن كلمة المرور)
export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

function sign(value: string) {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET as string).update(value).digest('hex');
}

// مقارنة بزمن ثابت (عبر تجزئة الطرفين) لتفادي تسريب معلومات من زمن المقارنة
function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string) {
  return adminConfigured() && safeEqual(input, process.env.ADMIN_PASSWORD as string);
}

export async function startSession() {
  const exp = String(Date.now() + SESSION_MS);
  const store = await cookies();
  store.set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MS / 1000,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split('.');
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}
