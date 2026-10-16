import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import OwnerDeleteButton from '@/components/account/owner_delete_button';
import { listingService } from '@/lib/listing_service';
import { formatPrice } from '@/lib/format';
import { orders } from '@/lib/orders_service';
import { dealers, isLive, listingLimit } from '@/lib/dealers_service';
import { getCurrentUser } from '@/lib/supabase_auth';
import { FEATURE_OPTIONS, featureRequestWhatsAppUrl } from '@/lib/site_config';
import { logoutAction } from '@/app/auth/actions';
import { renewMyListingAction, requestFeatureAction, setSoldAction, toggleMyListingAction } from '@/app/account/actions';

export const metadata: Metadata = { title: 'حسابي', robots: { index: false } };

const fmt = (d: Date) => new Date(d).toLocaleDateString('en-GB');

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');

  const [listings, requests, dealer] = await Promise.all([
    listingService.getByOwner(user.id),
    orders.listByUser(user.id),
    dealers.getByUser(user.id),
  ]);
  const now = Date.now();
  const limit = listingLimit(dealer);
  const activeCount = listings.filter((l) => (l.status === 'active' || l.status === 'pending') && !l.soldAt && !(l.expiresAt && l.expiresAt.getTime() <= now)).length;
  const atLimit = activeCount >= limit;
  const pendingByListing = new Map(requests.filter((r) => r.status === 'pending').map((r) => [r.listingId, r]));

  return (
    <MainLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">إعلاناتي</h1>
          <p className="mt-1 text-sm text-gray-500" dir="ltr">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/listings/new" className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-emerald-950 hover:bg-amber-300">
            + إعلان جديد
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="rounded-xl bg-stone-200 px-5 py-2 text-sm font-bold hover:bg-stone-300">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </div>

      {submitted && (
        <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          تم استلام إعلانك وهو قيد المراجعة. سيظهر للعامة بعد موافقة الإدارة، وغالباً خلال ساعات.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
        <p>
          الإعلانات الفعّالة: <b>{activeCount}</b> من <b>{limit}</b>
          {atLimit && <span className="mr-2 font-bold text-red-700">وصلت للحد الأقصى</span>}
        </p>
        <Link href="/account/dealer" className="font-bold text-emerald-800 hover:underline">
          {dealer ? (isLive(dealer) ? 'حساب التاجر' : 'تجديد اشتراك التاجر') : 'ارفع الحد: سجّل كتاجر ←'}
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-black/5">
          لم تنشر أي إعلان بعد.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {listings.map((l) => {
            const expired = Boolean(l.expiresAt && l.expiresAt.getTime() <= now);
            const pending = pendingByListing.get(l.id);
            const canFeature = l.status === 'active' && !l.soldAt && !expired && !l.isFeatured && !pending;
            return (
              <div key={l.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-4">
                    {l.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
                    )}
                    <div>
                      <Link href={`/listings/${l.id}`} className="text-lg font-bold text-emerald-900 hover:underline">
                        {l.title}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {formatPrice(l.price, l.currency)} · {l.city}
                      </p>
                      {l.status === 'blocked' && l.rejectReason && (
                        <p className="mt-2 max-w-xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                          <b>سبب الرفض:</b> {l.rejectReason}
                          <span className="mt-1 block text-xs text-red-700/80">يمكنك نشر إعلان جديد بعد تصحيح المخالفة، أو تواصل معنا إن رأيت أن القرار خاطئ.</span>
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        {l.status === 'blocked' && <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">محظور من الإدارة</span>}
                        {l.status === 'pending' && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">قيد المراجعة</span>}
                        {l.status === 'hidden' && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-gray-700">مخفي</span>}
                        {expired && <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">منتهٍ</span>}
                        {l.status === 'active' && l.soldAt && (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">تم البيع</span>
                        )}
                        {l.status === 'active' && !l.soldAt && !expired && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                            منشور{l.expiresAt ? ` حتى ${fmt(l.expiresAt)}` : ''}
                          </span>
                        )}
                        {l.isFeatured && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                            ★ مميز{l.featuredUntil ? ` حتى ${fmt(l.featuredUntil)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {l.status !== 'blocked' && (
                      <>
                        <Link href={`/listings/${l.id}/edit`} className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold hover:bg-stone-200">
                          تعديل
                        </Link>
                        {l.status === 'active' && (
                          <form action={setSoldAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="sold" value={l.soldAt ? '0' : '1'} />
                            <button type="submit" className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">
                              {l.soldAt ? 'أعد للبيع' : '✓ تم البيع'}
                            </button>
                          </form>
                        )}
                        {l.status !== 'pending' && (<>
                        <form action={renewMyListingAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <button type="submit" className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                            تجديد 60 يوماً
                          </button>
                        </form>
                        <form action={toggleMyListingAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <button type="submit" className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold hover:bg-stone-200">
                            {l.status === 'hidden' ? 'إظهار' : 'إخفاء'}
                          </button>
                        </form>
                        </>)}
                      </>
                    )}
                    <OwnerDeleteButton id={l.id} title={l.title} />
                  </div>
                </div>

                {canFeature && (
                  <form action={requestFeatureAction} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3">
                    <input type="hidden" name="id" value={l.id} />
                    <span className="text-sm font-bold">★ ميّز إعلانك:</span>
                    <select name="days" defaultValue="7" className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm">
                      {FEATURE_OPTIONS.map((o) => (
                        <option key={o.days} value={o.days}>
                          {o.label} - ${o.price}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-bold text-emerald-950 hover:bg-amber-300">
                      اطلب التمييز
                    </button>
                  </form>
                )}

                {pending && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm">
                    <p className="font-bold">
                      طلب تمييز رقم {pending.id} قيد الانتظار: {pending.days} يوماً بمبلغ ${pending.amount}
                    </p>
                    <p className="mt-1 text-gray-600">
                      حوّل المبلغ ثم أرسل إثبات الدفع عبر واتساب ليتم تفعيل التمييز.
                    </p>
                    <a
                      href={featureRequestWhatsAppUrl({
                        id: pending.id,
                        listingId: pending.listingId,
                        days: pending.days,
                        amount: pending.amount,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block rounded-lg bg-green-600 px-4 py-1.5 font-bold text-white hover:bg-green-700"
                    >
                      💬 أرسل إثبات الدفع
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
