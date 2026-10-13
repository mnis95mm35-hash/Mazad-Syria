'use server';

import { redirect } from 'next/navigation';
import { supabaseAuth, authConfigured } from '@/lib/supabase_auth';
import { isLimited, recordEvent } from '@/lib/rate_limit';
import { CAPTCHA_ERROR, verifyTurnstile } from '@/lib/turnstile';

export type AuthState = { error?: string; message?: string };

// نقبل مساراً داخلياً فقط حتى لا يحوّل أحدهم المستخدم إلى موقع آخر بعد الدخول
function safeNext(v: FormDataEntryValue | null): string {
  const s = String(v ?? '');
  return s.startsWith('/') && !s.startsWith('//') ? s : '/account';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function registerAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (!authConfigured()) return { error: 'التسجيل غير مفعّل بعد.' };
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  const next = safeNext(fd.get('next'));

  if (!EMAIL_RE.test(email)) return { error: 'البريد الإلكتروني غير صالح.' };
  if (password.length < 8) return { error: 'كلمة المرور قصيرة (8 أحرف على الأقل).' };
  if (await isLimited('register', [{ max: 5, windowMs: 60 * 60 * 1000 }])) {
    return { error: 'محاولات كثيرة. حاول لاحقاً.' };
  }
  if (!(await verifyTurnstile(fd))) return { error: CAPTCHA_ERROR };
  await recordEvent('register');

  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    if (/registered|exists/i.test(error.message)) return { error: 'هذا البريد مسجّل مسبقاً. سجّل الدخول.' };
    return { error: 'تعذّر إنشاء الحساب. حاول مرة أخرى.' };
  }
  // إن كان تأكيد البريد مفعّلاً في Supabase فلن تُنشأ جلسة حتى يضغط المستخدم رابط التأكيد
  if (!data.session) return { message: 'أرسلنا رابط تأكيد إلى بريدك. افتحه ثم سجّل الدخول.' };
  redirect(next);
}

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (!authConfigured()) return { error: 'تسجيل الدخول غير مفعّل بعد.' };
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  const next = safeNext(fd.get('next'));

  // 10 محاولات فاشلة كحد أقصى كل 15 دقيقة
  if (await isLimited('user-login', [{ max: 10, windowMs: 15 * 60 * 1000 }])) {
    return { error: 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً.' };
  }
  const sb = await supabaseAuth();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    await recordEvent('user-login');
    if (/confirm/i.test(error.message)) return { error: 'أكّد بريدك الإلكتروني أولاً من الرابط الذي وصلك.' };
    return { error: 'البريد أو كلمة المرور غير صحيحة.' };
  }
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  if (authConfigured()) {
    const sb = await supabaseAuth();
    await sb.auth.signOut();
  }
  redirect('/');
}
