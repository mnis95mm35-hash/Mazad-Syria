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
import { dealers, isLive } from '@/lib/dealers_service';
import { DEALER_PLANS } from '@/lib/site_config';
import { reports } from '@/lib/reports_service';
import { REJECT_REASONS } from '@/lib/review';
import { specsOf } from '@/lib/attributes';
import { notifyConfigured } from '@/lib/notify';
import {
  approveListingAction,
  rejectListingAction,
  dismissReportsAction,
  blockReportedListingAction,
  activatePlanRequestAction,
  rejectPlanRequestAction,
  setDealerStatusAction,
  setDealerVerifiedAction,
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

// منذ كم من الوقت (للمراجعة السريعة)
function ageOf(d: Date): { text: string; hours: number } {
  const mins = Math.max(Math.floor((Date.now() - new Date(d).getTime()) / 60000), 0);
  const hours = mins / 60;
  if (mins < 60) return { text: `منذ ${mins} دقيقة`, hours };
  if (hours < 48) return { text: `منذ ${Math.floor(hours)} ساعة`, hours };
  return { text: `منذ ${Math.floor(hours / 24)} يوماً`, hours };
}

function RejectForm({ action, id, label }: { action: (fd: FormData) => Promise<void>; id: number; label: string }) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="reason" required defaultValue="" className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs">
        <option value="" disabled>سبب الرفض</option>
        {REJECT_REASONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <input name="note" maxLength={200} placeholder="ملاحظة (اختياري)" className="w-40 rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
      <button type="submit" className="rounded-lg bg-red-50 px-4 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">
        {label}
      </button>
    </form>
  );
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

  const [listings, requests, reportCounts, planRequests, allDealers, openReports] = await Promise.all([
    listingService.getAllListings(),
    orders.listRecent(),
    reports.countsByListing(),
    dealers.listRecentRequests(),
    dealers.listAll(),
    reports.listOpen(),
  ]);
  const byId = new Map(listings.map((l) => [l.id, l]));
  // نجمع البلاغات المفتوحة حسب الإعلان
  const reportGroups = [...new Set(openReports.map((r) => r.listingId))]
    .map((listingId) => ({ listingId, items: openReports.filter((r) => r.listingId === listingId) }))
    .sort((a, b) => b.items.length - a.items.length);
  const pendingListings = listings.filter((l) => l.status === 'pending');
  const pendingPlans = planRequests.filter((r) => r.status === 'pending');
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

      {!notifyConfigured() && (
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          إشعارات تيليجرام غير مفعّلة: أضف <code dir="ltr">TELEGRAM_BOT_TOKEN</code> و<code dir="ltr">TELEGRAM_CHAT_ID</code> في إعدادات Render لتصلك رسالة فور وصول إعلان أو بلاغ.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <a href="#pending" className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-sm text-gray-500">بانتظار المراجعة</p>
          <p className={`text-3xl font-black ${pendingListings.length ? 'text-red-600' : 'text-emerald-800'}`}>{pendingListings.length}</p>
        </a>
        <a href="#reports" className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-sm text-gray-500">إعلانات عليها بلاغات</p>
          <p className={`text-3xl font-black ${reportGroups.length ? 'text-orange-600' : 'text-emerald-800'}`}>{reportGroups.length}</p>
        </a>
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

      <section id="pending" className="mt-8 scroll-mt-24">
        <h2 className="mb-3 text-xl font-extrabold">إعلانات بانتظار المراجعة ({pendingListings.length})</h2>
        {pendingListings.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/5">لا توجد إعلانات بانتظار المراجعة.</p>
        ) : (
          <div className="space-y-3">
            {pendingListings.map((l) => {
              const age = ageOf(l.createdAt);
              const specs = specsOf(l);
              return (
                <div key={l.id} className={`rounded-2xl bg-white p-4 ring-1 ${age.hours >= 6 ? 'ring-red-300' : 'ring-black/5'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-bold">
                      #{l.id} · {l.title} · {formatPrice(l.price, l.currency)}
                    </p>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${age.hours >= 6 ? 'bg-red-50 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                      {age.text}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {categoryInfo(l.category).label} · {l.city}{l.area ? ` - ${l.area}` : ''} · {l.sellerName}
                    {l.sellerPhone ? ` · ${l.sellerPhone}` : ''} · {fmtDate(l.createdAt)}
                  </p>
                  {specs.length > 0 && (
                    <p className="mt-1 text-sm text-gray-700">{specs.map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
                  )}
                  {l.lat !== null && l.lat !== undefined && l.lng !== null && l.lng !== undefined && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=16/${l.lat}/${l.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm font-bold text-emerald-800 hover:underline"
                    >
                      📍 عرض الموقع على الخريطة
                    </a>
                  )}
                  {l.description && <p className="mt-2 max-w-3xl whitespace-pre-line text-sm text-gray-700">{l.description}</p>}
                  {(l.images ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(l.images ?? []).map((src) => (
                        <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" loading="lazy" className="h-24 w-24 rounded-xl object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                    <form action={approveListingAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800">
                        قبول ونشر
                      </button>
                    </form>
                    <RejectForm action={rejectListingAction} id={l.id} label="رفض" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section id="reports" className="mt-8 scroll-mt-24">
        <h2 className="mb-3 text-xl font-extrabold">البلاغات المفتوحة ({reportGroups.length} إعلان)</h2>
        {reportGroups.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/5">لا توجد بلاغات مفتوحة.</p>
        ) : (
          <div className="space-y-3">
            {reportGroups.map(({ listingId, items }) => {
              const l = byId.get(listingId);
              return (
                <div key={listingId} className="rounded-2xl bg-white p-4 ring-1 ring-orange-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-bold">
                        {l ? (
                          <Link href={`/listings/${l.id}`} className="text-emerald-900 hover:underline">
                            #{l.id} · {l.title}
                          </Link>
                        ) : (
                          `إعلان #${listingId}`
                        )}{' '}
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700">🚩 {items.length} بلاغ</span>
                        {l?.status === 'blocked' && (
                          <span className="mr-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">محظور حالياً</span>
                        )}
                      </p>
                      {l && (
                        <p className="text-gray-500">
                          {categoryInfo(l.category).label} · {l.city} · {l.sellerName}
                          {l.sellerPhone ? ` · ${l.sellerPhone}` : ''} · {formatPrice(l.price, l.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {items.map((r) => (
                      <li key={r.id} className="rounded-lg bg-stone-50 px-3 py-2">
                        <b>{r.reason}</b>
                        <span className="mr-2 text-xs text-gray-500">{ageOf(r.createdAt).text}</span>
                        {r.details && <p className="mt-0.5 whitespace-pre-line text-gray-700">{r.details}</p>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                    <form action={dismissReportsAction}>
                      <input type="hidden" name="id" value={listingId} />
                      <button type="submit" className="rounded-lg bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                        البلاغ غير صحيح: تجاهل{l?.status === 'blocked' ? ' وأعد الإعلان' : ''}
                      </button>
                    </form>
                    <RejectForm action={blockReportedListingAction} id={listingId} label="البلاغ صحيح: حظر الإعلان" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">طلبات اشتراك التجار المعلقة ({pendingPlans.length})</h2>
        {pendingPlans.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/5">لا توجد طلبات معلقة.</p>
        ) : (
          <div className="space-y-3">
            {pendingPlans.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="text-sm">
                  <p className="font-bold">
                    طلب #{r.id} · {r.dealerName ?? `تاجر #${r.dealerId}`}
                  </p>
                  <p className="text-gray-500">
                    {DEALER_PLANS[r.plan].name} · {r.months} شهراً · ${r.amount} · {fmtDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={activatePlanRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-amber-300">
                      تم الدفع: فعّل الاشتراك
                    </button>
                  </form>
                  <form action={rejectPlanRequestAction}>
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

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">التجار ({allDealers.length})</h2>
        {allDealers.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/5">لا يوجد تجار بعد.</p>
        ) : (
          <div className="space-y-3">
            {allDealers.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="text-sm">
                  <p className="font-bold">
                    {isLive(d) ? (
                      <Link href={`/dealer/${d.slug}`} className="text-emerald-900 hover:underline">{d.name}</Link>
                    ) : (
                      d.name
                    )}{' '}
                    {d.verified && <span className="text-sky-700">✔ موثّق</span>}
                  </p>
                  <p className="text-gray-500">
                    {DEALER_PLANS[d.plan].name} ·{' '}
                    {d.status === 'suspended'
                      ? 'موقوف'
                      : isLive(d)
                        ? `ساري حتى ${fmtDate(d.planUntil!)}`
                        : d.status === 'pending'
                          ? 'بانتظار الدفع'
                          : 'منتهي'}
                    {d.phone ? ` · ${d.phone}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={setDealerVerifiedAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="verified" value={d.verified ? '0' : '1'} />
                    <button type="submit" className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100">
                      {d.verified ? 'إزالة التوثيق' : 'توثيق'}
                    </button>
                  </form>
                  <form action={setDealerStatusAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="status" value={d.status === 'suspended' ? 'active' : 'suspended'} />
                    <button type="submit" className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold hover:bg-stone-200">
                      {d.status === 'suspended' ? 'إعادة التفعيل' : 'إيقاف'}
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
                    {l.status === 'pending' && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">بانتظار المراجعة</span>
                    )}
                    {l.status === 'blocked' && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">
                        محظور{l.rejectReason ? `: ${l.rejectReason}` : ''}
                      </span>
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
