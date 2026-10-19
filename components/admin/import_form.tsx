'use client';

import { useActionState, useTransition, type FormEvent } from 'react';
import { importListingsAction, type ImportState } from '@/app/admin/import/actions';

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

export default function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importListingsAction, {});
  const [, startTransition] = useTransition();

  // إرسال يدوي حتى لا يمسح React الجدول الملصوق بعد كل معاينة
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    fd.set('mode', submitter?.value === 'import' ? 'import' : 'preview');
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-bold">الجدول (الصقه من Excel أو Google Sheets، أو CSV)</span>
        <textarea
          name="table"
          rows={10}
          dir="auto"
          required
          className={`${input} font-mono`}
          placeholder={'العنوان,السعر,العملة,القسم,المحافظة,الهاتف,الوصف\nتويوتا كورولا 2015,5500,USD,سيارات,حلب,0933123456,فل أوتوماتيك'}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold">اسم البائع الافتراضي</span>
          <input name="defaultName" placeholder="اسم المعرض" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold">هاتف افتراضي (للصفوف الناقصة)</span>
          <input name="defaultPhone" dir="ltr" placeholder="09XXXXXXXX" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold">بريد حساب المالك (اختياري)</span>
          <input name="ownerEmail" type="email" dir="ltr" placeholder="dealer@example.com" className={input} />
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" value="yes" className="mt-1" />
        <span>أؤكد أن أصحاب هذه الإعلانات وافقوا على نشرها في الموقع (مطلوب قبل الاستيراد)</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" value="preview" disabled={pending} className="rounded-lg bg-stone-200 px-5 py-2 text-sm font-bold hover:bg-stone-300 disabled:opacity-60">
          {pending ? 'لحظة...' : 'معاينة وفحص'}
        </button>
        <button type="submit" value="import" disabled={pending} className="rounded-lg bg-emerald-800 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
          استيراد ونشر مباشرة
        </button>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok !== undefined && (
        <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-black/5">
          <p className="font-bold text-emerald-800">
            {state.imported ? `تم نشر ${state.ok} إعلاناً.` : `${state.ok} صفاً سليماً جاهزاً للاستيراد.`}
            {state.failed && state.failed.length > 0 && <span className="mr-2 text-red-700">({state.failed.length} فيها أخطاء)</span>}
          </p>
          {state.preview && state.preview.length > 0 && !state.imported && (
            <ul className="mt-2 space-y-1 text-gray-700">
              {state.preview.map((p, i) => (
                <li key={i}>• {p.title} — {p.price} — {p.city}</li>
              ))}
            </ul>
          )}
          {state.failed && state.failed.length > 0 && (
            <ul className="mt-3 space-y-1 text-red-700">
              {state.failed.slice(0, 30).map((f) => (
                <li key={f.row}>سطر {f.row}: {f.msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
