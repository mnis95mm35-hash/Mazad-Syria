// Cloudflare Turnstile: كابتشا مجانية وغير مزعجة.
// إن لم تُضبط المفاتيح في متغيرات البيئة تُعطَّل الحماية بصمت (مفيد للتطوير المحلي).

export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY || null;
}

function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export const CAPTCHA_ERROR = 'تعذّر التحقق من أنك لست روبوتاً. أعد المحاولة بعد اكتمال التحقق.';
export const CAPTCHA_MISSING = 'لم يكتمل التحقق بعد. انتظر ظهور علامة ✓ في مربع التحقق ثم اضغط إرسال.';
export const CAPTCHA_EXPIRED = 'انتهت صلاحية التحقق. انتظر أن يتجدد مربع التحقق (علامة ✓) ثم أعد المحاولة.';

// يعيد نص الخطأ المناسب أو null عند النجاح. نسجّل رموز Cloudflare في سجلات الخادم لتشخيص المشاكل
// (مثل invalid-input-secret أو hostname غير مسموح) دون كشفها للمستخدم
export async function turnstileError(fd: FormData): Promise<string | null> {
  if (!turnstileEnabled()) return null;
  const token = String(fd.get('cf-turnstile-response') ?? '');
  if (!token) {
    console.warn('turnstile: no token in form (widget not finished or blocked on client)');
    return CAPTCHA_MISSING;
  }
  if (token.length > 2048) return CAPTCHA_ERROR;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY as string, response: token });
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[]; hostname?: string };
    if (data.success === true) return null;
    const codes = data['error-codes'] ?? [];
    console.error('turnstile rejected', { codes, hostname: data.hostname });
    if (codes.includes('timeout-or-duplicate')) return CAPTCHA_EXPIRED;
    return CAPTCHA_ERROR;
  } catch (e) {
    console.error('turnstile verify failed', e);
    return CAPTCHA_ERROR;
  }
}

// يتحقق من رمز الكابتشا القادم من النموذج. عند تعذّر الوصول لـ Cloudflare نرفض (آمن افتراضياً)
export async function verifyTurnstile(fd: FormData): Promise<boolean> {
  return (await turnstileError(fd)) === null;
}
