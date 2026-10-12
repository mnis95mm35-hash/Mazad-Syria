'use client';

import { useActionState } from 'react';
import { saveDealerAction, type DealerFormState } from '@/app/account/dealer/actions';
import { CITIES } from '@/lib/sample_data';
import { DEALER_PLANS, DEALER_TERMS, type DealerPlanId } from '@/lib/site_config';

const input = 'w-full rounded-lg border border-gray-300 px-4 py-2';

export type DealerFormValues = {
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
};

export default function DealerForm({ dealer }: { dealer?: DealerFormValues }) {
  const [state, action, pending] = useActionState<DealerFormState, FormData>(saveDealerAction, {});
  const editing = Boolean(dealer);

  return (
    <form action={action} className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-black/5 md:p-8">
      <h2 className="text-xl font-extrabold">{editing ? 'بيانات المعرض' : 'سجّل معرضك'}</h2>
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">اسم المعرض / المحل *</span>
        <input name="name" required maxLength={60} defaultValue={dealer?.name} className={input} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">رابط صفحتك *</span>
        <div className="flex items-center gap-2" dir="ltr">
          <span className="text-sm text-gray-500">/dealer/</span>
          <input
            name="slug"
            required={!editing}
            disabled={editing}
            defaultValue={dealer?.slug}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={3}
            maxLength={40}
            placeholder="al-noor-cars"
            className={`${input} ${editing ? 'bg-stone-100' : ''}`}
          />
        </div>
        <span className="mt-1 block text-xs text-gray-500">
          {editing ? 'لا يمكن تغيير الرابط بعد الإنشاء.' : 'أحرف إنجليزية صغيرة وأرقام وشرطات فقط، ولا يمكن تغييره لاحقاً.'}
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">نبذة عن المعرض</span>
        <textarea name="description" rows={4} maxLength={1000} defaultValue={dealer?.description ?? ''} className={input} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">رقم الهاتف / واتساب *</span>
          <input name="phone" required dir="ltr" defaultValue={dealer?.phone ?? ''} placeholder="09XXXXXXXX" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">المحافظة</span>
          <select name="city" defaultValue={dealer?.city ?? ''} className={input}>
            <option value="">—</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">العنوان</span>
        <input name="address" maxLength={200} defaultValue={dealer?.address ?? ''} className={input} />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium">الشعار (اختياري)</span>
        {dealer?.logoUrl && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dealer.logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/10" />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" name="removeLogo" /> حذف الشعار الحالي
            </label>
          </div>
        )}
        <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      </div>

      {!editing && (
        <fieldset className="space-y-3 rounded-2xl bg-amber-50 p-4">
          <legend className="px-2 text-sm font-bold">الباقة والمدة</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(DEALER_PLANS) as DealerPlanId[]).map((id) => (
              <label key={id} className="flex cursor-pointer gap-3 rounded-xl bg-white p-3 ring-1 ring-black/10 has-[:checked]:ring-2 has-[:checked]:ring-emerald-700">
                <input type="radio" name="plan" value={id} defaultChecked={id === 'dealer'} required />
                <span>
                  <span className="block font-bold">{DEALER_PLANS[id].name} - ${DEALER_PLANS[id].monthly} شهرياً</span>
                  <span className="block text-xs text-gray-600">{DEALER_PLANS[id].features.join(' · ')}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">مدة الاشتراك</span>
            <select name="months" defaultValue="1" className={input}>
              {DEALER_TERMS.map((t) => (
                <option key={t.months} value={t.months}>{t.label}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-gray-600">
            بعد التسجيل يظهر لك المبلغ المطلوب وزر إرسال إثبات الدفع عبر واتساب، وتُفعَّل الباقة بعد تأكيد الدفع.
          </p>
        </fieldset>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-900 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? 'لحظة...' : editing ? 'حفظ التعديلات' : 'سجّل معرضي'}
      </button>
    </form>
  );
}
