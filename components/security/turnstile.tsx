'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Opts = {
  sitekey: string;
  theme?: string;
  language?: string;
  retry?: string;
  'refresh-expired'?: string;
  callback?: (token: string) => void;
  'error-callback'?: (code?: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Opts) => string;
      remove: (id: string) => void;
    };
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const LOAD_TIMEOUT_MS = 20000;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const timer = setTimeout(() => reject(new Error('turnstile load timeout')), LOAD_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve();
      else reject(new Error('turnstile missing'));
    };
    // نحذف نسخة فاشلة سابقة حتى تُحمَّل من جديد عند «إعادة المحاولة»
    document.querySelectorAll(`script[src="${SRC}"]`).forEach((el) => {
      if (!window.turnstile) el.remove();
    });
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.addEventListener('load', done);
    s.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('turnstile load failed'));
    });
    document.head.appendChild(s);
  });
}

type Status = 'loading' | 'ready' | 'error';

// يضيف حقلاً مخفياً باسم cf-turnstile-response داخل النموذج. الرمز يُستهلك مرة واحدة،
// لذلك نعيد رسم الأداة كلما تغيّر resetKey (بعد كل إرسال).
// onReadyChange(true) عند اكتمال التحقق، وfalse عدا ذلك: نعطّل بها زر الإرسال لئلا يُرسل المستخدم قبل جاهزية الرمز
export default function Turnstile({
  siteKey,
  resetKey,
  onReadyChange,
}: {
  siteKey: string | null;
  resetKey?: unknown;
  onReadyChange?: (ready: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  const cb = useRef(onReadyChange);
  useEffect(() => {
    cb.current = onReadyChange;
  });

  const update = useCallback((s: Status) => {
    setStatus(s);
    cb.current?.(s === 'ready');
  }, []);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let widgetId: string | null = null;
    let cancelled = false;
    update('loading');
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: 'light',
          language: 'ar',
          retry: 'auto',
          'refresh-expired': 'auto',
          callback: () => !cancelled && update('ready'),
          'error-callback': () => !cancelled && update('error'),
          'expired-callback': () => !cancelled && update('loading'),
          'timeout-callback': () => !cancelled && update('loading'),
        });
      })
      .catch(() => {
        if (!cancelled) update('error');
      });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, resetKey, attempt, update]);

  if (!siteKey) return null;
  return (
    <div>
      <div ref={ref} className="min-h-[65px]" />
      {status === 'loading' && <p className="mt-1 text-xs text-gray-500">جارٍ التحقق من أنك لست روبوتاً... انتظر ظهور علامة ✓ قبل الإرسال.</p>}
      {status === 'error' && (
        <p className="mt-1 text-xs text-red-700">
          تعذّر تحميل التحقق (قد يكون الاتصال ضعيفاً أو هناك مانع إعلانات/VPN).{' '}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-bold underline">
            إعادة المحاولة
          </button>
        </p>
      )}
    </div>
  );
}
