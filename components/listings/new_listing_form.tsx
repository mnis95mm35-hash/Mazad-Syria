'use client';

import { useActionState } from 'react';
import { createListingAction, updateListingAction, type FormState } from '@/app/listings/actions';
import { CATEGORIES, CITIES, type Listing } from '@/lib/sample_data';

const input = 'w-full border border-gray-300 rounded-lg px-4 py-2';

// نموذج واحد للإنشاء والتعديل: عند تمرير listing يعمل كنموذج تعديل
export default function ListingForm({ listing }: { listing?: Listing }) {
  const editing = Boolean(listing);
  const [state, action, pending] = useActionState<FormState, FormData>(
    editing ? updateListingAction : createListingAction,
    {},
  );

  return (
    <form action={action} className="relative bg-white border border-gray-200 rounded-xl p-6 space-y-4 max-w-2xl">
      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{state.error}</p>
      )}
      {listing && <input type="hidden" name="id" value={listing.id} />}

      {/* فخ للروبوتات: مخفي عن البشر */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          الموقع
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1">عنوان الإعلان</span>
        <input name="title" required minLength={3} maxLength={120} defaultValue={listing?.title} className={input} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">القسم</span>
          <select name="category" required defaultValue={listing?.category ?? ''} className={input}>
            <option value="" disabled>اختر القسم</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">المدينة</span>
          <select name="city" required defaultValue={listing?.city ?? ''} className={input}>
            <option value="" disabled>اختر المدينة</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1">السعر (بالدولار)</span>
        <input name="price" type="number" min={0} step="any" required defaultValue={listing?.price} className={input} />
      </label>

      {listing && (listing.images ?? []).length > 0 && (
        <fieldset>
          <legend className="block text-sm font-medium mb-2">الصور الحالية (أزل العلامة لحذف صورة)</legend>
          <div className="flex flex-wrap gap-3">
            {(listing.images ?? []).map((url) => (
              <label key={url} className="relative block h-24 w-24 overflow-hidden rounded-lg ring-1 ring-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <input type="checkbox" name="keep" value={url} defaultChecked className="absolute right-1 top-1 h-5 w-5" />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block">
        <span className="block text-sm font-medium mb-1">
          {editing ? 'إضافة صور جديدة' : 'صور الإعلان'} (اختياري، حتى 5 صور في المجموع، 3 ميغابايت للصورة)
        </span>
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
        <textarea name="description" rows={5} defaultValue={listing?.description ?? ''} className={input} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">اسمك</span>
          <input name="sellerName" required minLength={2} defaultValue={listing?.sellerName} className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">رقم الهاتف / واتساب</span>
          <input
            name="sellerPhone"
            type="tel"
            dir="ltr"
            required
            placeholder="09XXXXXXXX"
            defaultValue={listing?.sellerPhone ?? ''}
            className={input}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-emerald-600 text-white rounded-lg px-8 py-3 hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? 'جارٍ الحفظ...' : editing ? 'احفظ التعديلات' : 'انشر الإعلان'}
      </button>
    </form>
  );
}
