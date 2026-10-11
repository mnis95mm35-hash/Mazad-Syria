'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/app/admin/actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="mx-auto max-w-sm space-y-4 rounded-3xl bg-white p-8 ring-1 ring-black/5">
      <h1 className="text-2xl font-black">دخول الإدارة</h1>
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">كلمة المرور</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-900 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? 'جارٍ التحقق...' : 'دخول'}
      </button>
    </form>
  );
}
