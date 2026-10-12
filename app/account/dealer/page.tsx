import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import DealerForm from '@/components/dealer/dealer_form';
import { dealers, isLive } from '@/lib/dealers_service';
import { listingService } from '@/lib/listing_service';
import { getCurrentUser } from '@/lib/supabase_auth';
import {
  DEALER_PLANS,
  DEALER_TERMS,
  FREE_LISTING_LIMIT,
  dealerPrice,
  planRequestWhatsAppUrl,
  type DealerPlanId,
} from '@/lib/site_config';
import { listingLimit } from '@/lib/dealers_service';
import { requestPlanAction } from '@/app/account/dealer/actions';

export const metadata: Metadata = { title: 'حساب التاجر', robots: { index: false } };

const fmt = (d: Date) => new Date(d).toLocaleDateString('en-GB');

export default async function DealerAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account/dealer');

  const dealer = await dealers.getByUser(user.id);

  if (!dealer) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-black">حساب التاجر</h1>
          <p className="mt-2 text-gray-600">
            للمعارض والمحلات والوسطاء: صفحة عامة باسمك، وحد أعلى للإعلانات (من {FREE_LISTING_LIMIT} إلى{' '}
            {DEALER_PLANS.dealer.limit} أو {DEALER_PLANS.dealer_pro.limit}).
          </p>
          <div className="mt-6">
            <DealerForm />
          </div>
        </div>
      </MainLayout>
    );
  }

  const [requests, active] = await Promise.all([
    dealers.listRequestsByDealer(dealer.id),
    listingService.countActiveByOwner(user.id),
  ]);
  const pending = requests.find((r) => r.status === 'pending');
  const live = isLive(dealer);
  const limit = listingLimit(dealer);
  const expired = dealer.status === 'active' && !live;

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black">حساب التاجر</h1>
          <Link href="/account" className="text-sm font-bold text-emerald-800 hover:underline">← إعلاناتي</Link>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {dealer.status === 'suspended' && <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">موقوف من الإدارة</span>}
            {dealer.status === 'pending' && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">بانتظار تأكيد الدفع</span>}
            {live && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                {DEALER_PLANS[dealer.plan].name} · ساري حتى {fmt(dealer.planUntil!)}
              </span>
            )}
            {expired && <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">انتهى اشتراكك</span>}
            {dealer.verified && <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">✔ موثّق</span>}
          </div>
          <p className="mt-3 text-sm text-gray-700">
            الإعلانات الفعّالة: <b>{active}</b> من <b>{limit}</b>
          </p>
          {live ? (
            <p className="mt-2 text-sm">
              صفحتك العامة:{' '}
              <Link href={`/dealer/${dealer.slug}`} className="font-bold text-emerald-800 hover:underline" dir="ltr">
                /dealer/{dealer.slug}
              </Link>
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-600">تظهر صفحتك للعامة بعد تفعيل الاشتراك.</p>
          )}
        </div>

        {pending && (
          <div className="rounded-2xl bg-amber-50 p-5 text-sm">
            <p className="font-bold">
              طلب اشتراك رقم {pending.id}: {DEALER_PLANS[pending.plan].name} لمدة {pending.months} شهراً بمبلغ ${pending.amount}
            </p>
            <p className="mt-1 text-gray-600">حوّل المبلغ ثم أرسل إثبات الدفع عبر واتساب ليتم تفعيل الاشتراك.</p>
            <a
              href={planRequestWhatsAppUrl(pending)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-1.5 font-bold text-white hover:bg-green-700"
            >
              💬 أرسل إثبات الدفع
            </a>
          </div>
        )}

        {!pending && dealer.status !== 'suspended' && (
          <form action={requestPlanAction} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <h2 className="font-extrabold">{live ? 'تجديد أو ترقية الاشتراك' : 'تفعيل الاشتراك'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(DEALER_PLANS) as DealerPlanId[]).map((id) => (
                <label key={id} className="flex cursor-pointer gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-black/10 has-[:checked]:ring-2 has-[:checked]:ring-emerald-700">
                  <input type="radio" name="plan" value={id} defaultChecked={id === dealer.plan} required />
                  <span>
                    <span className="block font-bold">{DEALER_PLANS[id].name} - ${DEALER_PLANS[id].monthly} شهرياً</span>
                    <span className="block text-xs text-gray-600">{DEALER_PLANS[id].features.join(' · ')}</span>
                  </span>
                </label>
              ))}
            </div>
            <select name="months" defaultValue="1" className="w-full rounded-lg border border-gray-300 px-4 py-2">
              {DEALER_TERMS.map((t) => (
                <option key={t.months} value={t.months}>
                  {t.label} - ${dealerPrice('dealer', t.months)} (باقة تاجر) / ${dealerPrice('dealer_pro', t.months)} (مميّز)
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-amber-400 px-6 py-2.5 font-bold text-emerald-950 hover:bg-amber-300">
              اطلب الاشتراك
            </button>
          </form>
        )}

        <DealerForm dealer={dealer} />
      </div>
    </MainLayout>
  );
}
