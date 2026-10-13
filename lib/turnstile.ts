// Cloudflare Turnstile: كابتشا مجانية وغير مزعجة.
// إن لم تُضبط المفاتيح في متغيرات البيئة تُعطَّل الحماية بصمت (مفيد للتطوير المحلي).

export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY || null;
}

function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

// يتحقق من رمز الكابتشا القادم من النموذج. عند تعذّر الوصول لـ Cloudflare نرفض (آمن افتراضياً)
export async function verifyTurnstile(fd: FormData): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  const token = String(fd.get('cf-turnstile-response') ?? '');
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY as string, response: token });
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error('turnstile verify failed', e);
    return false;
  }
}

export const CAPTCHA_ERROR = 'تعذّر التحقق من أنك لست روبوتاً. أعد المحاولة بعد اكتمال التحقق.';
