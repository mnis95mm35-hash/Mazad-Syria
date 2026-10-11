import MainLayout from '@/components/layout/main_layout';
import { PLANS, SITE } from '@/lib/site_config';

export const metadata = { title: 'أعلن معنا | مزاد سوريا' };

export default function AdvertisePage() {
  const wa = (plan: string) =>
    `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`مرحباً، أريد الاشتراك في: ${plan}`)}`;

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black text-emerald-950 md:text-4xl">ميّز إعلانك وبِع أسرع</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          الإعلانات المميزة تظهر في أعلى الصفحة الرئيسية وفي مقدمة نتائج البحث، فتصل لمشترين أكثر.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col rounded-3xl bg-white p-6 ${
                p.highlight ? 'ring-2 ring-amber-400 shadow-xl' : 'ring-1 ring-black/5'
              }`}
            >
              {p.highlight && (
                <span className="mb-3 w-fit rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-emerald-950">
                  الأكثر طلباً
                </span>
              )}
              <h2 className="text-lg font-extrabold">{p.name}</h2>
              <p className="mt-3 text-4xl font-black text-emerald-800">{p.price}</p>
              <p className="text-sm text-gray-500">{p.period}&nbsp;</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-gray-700">
                {p.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {p.id === 'free' ? (
                <a href="/listings/new" className="mt-6 rounded-xl bg-emerald-50 py-3 text-center font-bold text-emerald-900 hover:bg-emerald-100">
                  انشر مجاناً
                </a>
              ) : (
                <a href={wa(p.name)} className="mt-6 rounded-xl bg-emerald-900 py-3 text-center font-bold text-white hover:bg-emerald-800">
                  اطلب عبر واتساب
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-gray-500">
          بعد التواصل معنا نؤكد الدفع ثم نفعّل التمييز على إعلانك.
        </p>
      </div>
    </MainLayout>
  );
}
