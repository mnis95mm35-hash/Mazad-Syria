import type { Metadata } from 'next';
import Link from 'next/link';
import MainLayout from '@/components/layout/main_layout';
import LoginForm from '@/components/admin/login_form';
import DeleteButton from '@/components/admin/delete_button';
import { categoryInfo } from '@/components/listings/listing_card';
import { adminConfigured, isAdmin } from '@/lib/admin_auth';
import { listingService } from '@/lib/listing_service';
import { formatPrice } from '@/lib/format';
import { orders } from '@/lib/orders_service';
import { reports } from '@/lib/reports_service';
import {
  activateRequestAction,
  featureListingAction,
  logoutAction,
  rejectRequestAction,
  renewListingAction,
  setStatusAction,
  unfeatureListingAction,
} from '@/app/admin/actions';

export const metadata: Metadata = {
  title: 'لوحة الإدارة',
  robots: { index: false, follow: false },
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-GB');
}

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 ring-1 ring-black/5">
          <h1 className="text-2xl font-black">لوحة الإدارة غير مفعّلة</h1>
          <p className="mt-3 text-gray-600">أضف السطرين التاليين إلى ملف <code dir="ltr">.env.local</code> ثم أعد تشغيل السيرفر:</p>
          <pre dir="ltr" className="mt-4 overflow-x-auto rounded-xl bg-stone-100 p-4 text-sm">{`ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=long-random-string`}</pre>
        </div>
      </MainLayout>
    );
  }

  if (!(await isAdmin())) {
    return (
      <MainLayout>
        <LoginForm />
      </MainLayout>
    );
  }

  const [listings, requests, reportCounts] = await Promise.all([
    listingService.getAllListings(),
    orders.listRecent(),
    reports.countsByListing(),
  ]);
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const now = Date.now();
  const isExpired = (l: (typeof listings)[number]) => Boolean(l.expiresAt && l.expiresAt.getTime() <= now);
  const featuredCount = listings.filter((l) => l.isFeatured).length;

  return (
    <MainLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black">لوحة الإدارة</h1>
        <form action={logoutAction}>
          <button type="submit" className="rounded-xl bg-stone-200 px-5 py-2 text-sm font-bold hover:bg-stone-300">
            تسجيل الخروج
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-sm text-gray-500">إجمالي الإعلانات</p>
          <p className="text-3xl font-black text-emerald-800">{listings.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-sm text-gray-500">إعلانات مميزة حالياً</p>
          <p className="text-3xl font-black text-amber-600">{featuredCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-sm text-gray-500">إعلانات عادية</p>
          <p className="text-3xl font-black">{listings.length - featuredCount}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">طلبات التمييز المعلقة ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/5">لا توجد طلبات معلقة.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="text-sm">
                  <p className="font-bold">
                    طلب #{r.id} · إعلان #{r.listingId} {r.listingTitle ? `(${r.listingTitle})` : ''}
                  </p>
                  <p className="text-gray-500">
                    {r.days} يوماً · ${r.amount} · {fmtDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={activateRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-amber-300">
                      تم الدفع: فعّل التمييز
                    </button>
                  </form>
                  <form action={rejectRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold hover:bg-stone-200">
                      رفض
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-3 mt-10 text-xl font-extrabold">كل الإعلانات</h2>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-stone-50 text-right text-gray-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">الإعلان</th>
              <th className="px-4 py-3">السعر</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3 text-gray-500">{l.id}</td>
                <td className="px-4 py-3">
                  <Link href={`/listings/${l.id}`} className="font-bold text-emerald-900 hover:underline">
                    {l.title}
                  </Link>
                  <div className="mt-1 text-xs text-gray-500">
                    {categoryInfo(l.category).label} · {l.city} · {l.sellerName}
                    {l.sellerPhone ? ` · ${l.sellerPhone}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 font-bold">{formatPrice(l.price, l.currency)}</td>
                <td className="px-4 py-3">
                  {l.isFeatured ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      ★ مميز {l.featuredUntil ? `حتى ${fmtDate(l.featuredUntil)}` : '(دائم)'}
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-gray-600">عادي</span>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1 text-xs">
                    {l.status === 'blocked' && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">محظور</span>
                    )}
                    {l.status === 'hidden' && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 font-bold text-gray-700">مخفي (من صاحبه)</span>
                    )}
                    {(reportCounts[l.id] ?? 0) > 0 && (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 font-bold text-orange-700">
                        🚩 {reportCounts[l.id]} بلاغ
                      </span>
                    )}
                    {isExpired(l) ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">منتهٍ</span>
                    ) : (
                      l.expiresAt && <span className="text-gray-500">ينتهي {fmtDate(l.expiresAt)}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={featureListingAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={l.id} />
                      <select name="days" defaultValue="7" className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs">
                        <option value="7">7 أيام</option>
                        <option value="30">30 يوماً</option>
                        <option value="90">90 يوماً</option>
                      </select>
                      <button type="submit" className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-amber-300">
                        {l.isFeatured ? 'تمديد' : 'ميّز'}
                      </button>
                    </form>
                    {l.isFeatured && (
                      <form action={unfeatureListingAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <button type="submit" className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold hover:bg-stone-200">
                          إلغاء التمييز
                        </button>
                      </form>
                    )}
                    <form action={renewListingAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button type="submit" className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                        تجديد 60 يوماً
                      </button>
                    </form>
                    <form action={setStatusAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="status" value={l.status === 'active' ? 'blocked' : 'active'} />
                      <button type="submit" className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold hover:bg-stone-200">
                        {l.status === 'active' ? 'حظر' : 'إظهار'}
                      </button>
                    </form>
                    <DeleteButton id={l.id} title={l.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
