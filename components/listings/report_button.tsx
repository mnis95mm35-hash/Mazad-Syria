'use client';

import { useActionState } from 'react';
import { reportListingAction, type ReportState } from '@/app/listings/report_actions';

const REASONS = ['احتيال أو نصب', 'محتوى مخالف', 'إعلان مكرر', 'معلومات أو سعر غير صحيح', 'أخرى'];

export default function ReportButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportListingAction, {});
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-gray-500 hover:text-red-700">🚩 الإبلاغ عن الإعلان</summary>
      <form action={action} className="mt-3 space-y-2">
        <input type="hidden" name="id" value={id} />
        <select name="reason" required defaultValue="" className="w-full rounded-lg border border-gray-300 px-3 py-2">
          <option value="" disabled>اختر السبب</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <textarea name="details" rows={2} maxLength={500} placeholder="تفاصيل إضافية (اختياري)" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-60">
          {pending ? 'جارٍ الإرسال...' : 'إرسال البلاغ'}
        </button>
        {state.error && <p className="text-red-700">{state.error}</p>}
        {state.message && <p className="text-emerald-800">{state.message}</p>}
      </form>
    </details>
  );
}
