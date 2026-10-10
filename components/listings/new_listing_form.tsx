'use client';

import { useActionState } from 'react';
import { createListingAction, type FormState } from '@/app/listings/actions';
import { CATEGORIES, CITIES } from '@/lib/sample_data';

const input = 'w-full border border-gray-300 rounded-lg px-4 py-2';

export default function NewListingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createListingAction, {});

  return (
    <form action={action} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 max-w-2xl">
      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{state.error}</p>
      )}

      <label className="block">
        <span className="block text-sm font-medium mb-1">عنوان الإعلان</span>
        <input name="title" required minLength={3} maxLength={120} className={input} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">القسم</span>
          <select name="category" required defaultValue="" className={input}>
            <option value="" disabled>اختر القسم</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">المدينة</span>
          <select name="city" required defaultValue="" className={input}>
            <option value="" disabled>اختر المدينة</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1">السعر (بالدولار)</span>
        <input name="price" type="number" min={0} step="any" required className={input} />
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">صور الإعلان (اختياري، حتى 5 صور، 3 ميغابايت للصورة)</span>
        <input
          name="images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-emerald-700"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">الوصف</span>
        <textarea name="description" rows={5} className={input} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">اسمك</span>
          <input name="sellerName" required minLength={2} className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">رقم الهاتف (اختياري)</span>
          <input name="sellerPhone" type="tel" dir="ltr" className={input} />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-emerald-600 text-white rounded-lg px-8 py-3 hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? 'جارٍ النشر...' : 'انشر الإعلان'}
      </button>
    </form>
  );
}
