'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition, type FormEvent } from 'react';
import Turnstile from '@/components/security/turnstile';
import { loginAction, registerAction, type AuthState } from '@/app/auth/actions';

const input = 'w-full rounded-lg border border-gray-300 px-4 py-2';

export default function AuthForm({
  mode,
  next,
  captchaSiteKey = null,
}: {
  mode: 'login' | 'register';
  next?: string;
  captchaSiteKey?: string | null;
}) {
  const isLogin = mode === 'login';
  const [state, action, pending] = useActionState<AuthState, FormData>(isLogin ? loginAction : registerAction, {});
  const nextQs = next ? `?next=${encodeURIComponent(next)}` : '';
  const needsCaptcha = !isLogin && Boolean(captchaSiteKey);
  const [captchaOk, setCaptchaOk] = useState(!needsCaptcha);
  const [, startTransition] = useTransition();

  // نرسل النموذج يدوياً حتى لا يمسح React البريد وكلمة المرور عند ظهور خطأ
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4 rounded-3xl bg-white p-8 ring-1 ring-black/5">
      <h1 className="text-2xl font-black">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{state.message}</p>
      )}
      <input type="hidden" name="next" value={next ?? ''} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">البريد الإلكتروني</span>
        <input name="email" type="email" required autoComplete="email" dir="ltr" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">كلمة المرور</span>
        <input
          name="password"
          type="password"
          required
          minLength={isLogin ? undefined : 8}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          dir="ltr"
          className={input}
        />
        {!isLogin && <span className="mt-1 block text-xs text-gray-500">8 أحرف على الأقل</span>}
      </label>
      {!isLogin && <Turnstile siteKey={captchaSiteKey} resetKey={state} onReadyChange={setCaptchaOk} />}
      <button
        type="submit"
        disabled={pending || !captchaOk}
        className="w-full rounded-xl bg-emerald-900 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? 'لحظة...' : !captchaOk ? 'بانتظار التحقق...' : isLogin ? 'دخول' : 'إنشاء الحساب'}
      </button>
      <p className="text-center text-sm text-gray-600">
        {isLogin ? (
          <>
            ليس لديك حساب؟ <Link href={`/register${nextQs}`} className="font-bold text-emerald-800 hover:underline">سجّل الآن</Link>
          </>
        ) : (
          <>
            لديك حساب؟ <Link href={`/login${nextQs}`} className="font-bold text-emerald-800 hover:underline">سجّل الدخول</Link>
          </>
        )}
      </p>
    </form>
  );
}
