import Link from 'next/link';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ListingCard from '@/components/listings/listing_card';
import SearchBar from '@/components/listings/search_bar';
import AdSlot from '@/components/listings/ad_slot';
import Pagination from '@/components/listings/pagination';
import { listingService } from '@/lib/listing_service';
import { CATEGORIES } from '@/lib/sample_data';
import { browsePath, categoryExists, isCurrency } from '@/lib/taxonomy';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    currency?: string;
    page?: string;
  }>;
}) {
  const { q, category, city, minPrice, maxPrice, sort, currency, page: pageParam } = await searchParams;
  const toNum = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) ? n : undefined;
  };
  const sortKey = sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest';
  // رابط قديم من نوع /?category=cars يُحوَّل إلى صفحة التصنيف النظيفة /cars
  if (category && categoryExists(category) && !q && !minPrice && !maxPrice && sortKey === 'newest' && !pageParam) {
    redirect(browsePath({ category, city }));
  }
  const cur = isCurrency(currency) ? currency : undefined;
  const filtering = Boolean(q || category || city || minPrice || maxPrice || sortKey !== 'newest');
  const base = {
    q,
    category,
    city,
    minPrice: toNum(minPrice),
    maxPrice: toNum(maxPrice),
    sort: sortKey,
    currency: cur,
  } as const;
  const pageNum = Math.max(Math.floor(Number(pageParam)) || 1, 1);

  // الرئيسية بلا فلاتر: المميّز في قسم خاص، والباقي مرقّم. مع الفلاتر: نتيجة واحدة مرقّمة.
  const [featuredPage, results] = await Promise.all([
    filtering
      ? Promise.resolve(null)
      : listingService.searchListings({ featured: 'only', pageSize: 8 }),
    listingService.searchListings({
      ...base,
      page: pageNum,
      featured: filtering ? undefined : 'exclude',
    }),
  ]);
  const featured = featuredPage?.items ?? [];
  const rest = results.items;

  return (
    <MainLayout bare>
      {/* Hero */}
      <section data-spot className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700">
        <div className="m-spot-layer" aria-hidden="true" />
        <div className="m-par pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="m-blob pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="m-blob m-blob-2 pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div aria-hidden="true" className="m-chip pointer-events-none absolute left-[8%] top-[18%] h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/20 backdrop-blur" style={{ '--d': '0s' } as React.CSSProperties}>🚗</div>
        <div aria-hidden="true" className="m-chip pointer-events-none absolute left-[22%] bottom-[16%] h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl ring-1 ring-white/20 backdrop-blur" style={{ '--d': '-2s' } as React.CSSProperties}>🏠</div>
        <div aria-hidden="true" className="m-chip pointer-events-none absolute left-[4%] bottom-[34%] h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/20 text-xl ring-1 ring-amber-200/30 backdrop-blur" style={{ '--d': '-4s' } as React.CSSProperties}>📱</div>
        </div>
        <div className="m-par-slow container relative mx-auto px-4 py-16 md:py-24">
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
            {['بِع', 'واشترِ', 'بسهولة', 'في'].map((w, i) => (
              <span key={w} className="m-word ml-[0.25em]" style={{ '--i': i } as React.CSSProperties}>
                {w}
              </span>
            ))}
            <span className="m-word m-gold" style={{ '--i': 4 } as React.CSSProperties}>
              كل سوريا
            </span>
          </h1>
          <p className="m-in mt-4 max-w-2xl text-lg text-emerald-100/90" style={{ '--d': '520ms' } as React.CSSProperties}>
            سيارات، عقارات، إلكترونيات وأكثر. انشر إعلانك مجاناً وتواصل مباشرة مع المشترين.
          </p>
          <div
            className="m-in mt-8 rounded-2xl bg-white/10 p-3 backdrop-blur ring-1 ring-white/20"
            style={{ '--d': '640ms' } as React.CSSProperties}
          >
            <SearchBar
              q={q}
              category={category}
              city={city}
              minPrice={minPrice}
              maxPrice={maxPrice}
              sort={sortKey}
              currency={cur}
            />
          </div>
          <div className="m-in mt-6 flex flex-wrap gap-3 text-sm text-emerald-100" style={{ '--d': '760ms' } as React.CSSProperties}>
            <span className="rounded-full bg-white/10 px-4 py-1.5">✓ النشر مجاني</span>
            <span className="rounded-full bg-white/10 px-4 py-1.5">✓ تواصل مباشر</span>
            <span className="rounded-full bg-white/10 px-4 py-1.5">✓ جميع المحافظات</span>
          </div>
        </div>
      </section>

      {/* شريط الأقسام المتحرك */}
      <div className="m-marquee border-b border-black/5 bg-white py-3" aria-hidden="true">
        <div className="m-marquee-track gap-3 pl-3">
          {[...CATEGORIES, ...CATEGORIES, ...CATEGORIES, ...CATEGORIES].map((c, i) => (
            <span
              key={i}
              className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-900"
            >
              <span>{c.icon}</span>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Categories */}
        <section className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              style={{ '--i': i } as React.CSSProperties}
              data-tilt
              className={`m-tilt m-scroll m-flip rounded-2xl bg-white p-4 text-center ${
                category === c.slug ? 'ring-2 ring-emerald-700' : 'ring-1 ring-black/5'
              }`}
            >
              <div className="text-4xl">{c.icon}</div>
              <div className="mt-2 text-sm font-bold">{c.label}</div>
            </Link>
          ))}
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="m-title text-2xl font-extrabold">★ إعلانات مميزة</h2>
              <Link href="/advertise" className="text-sm font-semibold text-emerald-800 hover:underline">
                كيف أميّز إعلاني؟
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((l, i) => (
                <div key={l.id} className="m-scroll" style={{ '--i': i % 4 } as React.CSSProperties}>
                  <ListingCard listing={l} />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          <AdSlot />
        </div>

        {/* Latest */}
        <section className="mt-12">
          <h2 className="m-title mb-6 text-2xl font-extrabold">
            {filtering ? `نتائج البحث (${results.total})` : 'أحدث الإعلانات'}
          </h2>
          {rest.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-black/5">
              لا توجد نتائج مطابقة. جرّب تغيير البحث أو الفلاتر.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rest.map((l, i) => (
                <div key={l.id} className="m-scroll" style={{ '--i': i % 4 } as React.CSSProperties}>
                  <ListingCard listing={l} />
                </div>
              ))}
            </div>
          )}
          <Pagination
            page={results.page}
            pageCount={results.pageCount}
            params={{
              q,
              category,
              city,
              minPrice,
              maxPrice,
              sort: sortKey === 'newest' ? undefined : sortKey,
              currency: cur,
            }}
          />
        </section>

        {/* How it works */}
        {!filtering && (
          <section className="mt-16">
            <h2 className="m-title mb-8 text-2xl font-extrabold">كيف تبيع في 3 خطوات؟</h2>
            <div className="relative grid gap-5 md:grid-cols-3">
              <div className="m-line pointer-events-none absolute right-[16%] top-9 hidden h-0.5 w-[68%] bg-gradient-to-l from-amber-300 via-emerald-400 to-amber-300 md:block" />
              {[
                { n: '1', t: 'سجّل حسابك', d: 'ببريدك الإلكتروني وكلمة مرور، دون رسوم.' },
                { n: '2', t: 'انشر إعلانك', d: 'أضف الصور والسعر ومدينتك. نراجع الإعلانات الجديدة لحماية المشترين.' },
                { n: '3', t: 'استقبل المشترين', d: 'يتواصل المشتري معك مباشرة بالهاتف أو واتساب.' },
              ].map((x, i) => (
                <div
                  key={x.n}
                  className="m-scroll m-flip relative rounded-3xl bg-white p-6 text-center ring-1 ring-black/5"
                  style={{ '--i': i } as React.CSSProperties}
                >
                  <span className="relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-emerald-900 text-3xl font-black text-amber-300 ring-4 ring-stone-50">
                    {x.n}
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold">{x.t}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-600">{x.d}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Seller CTA */}
        <section className="m-scroll mt-14 overflow-hidden rounded-3xl bg-gradient-to-l from-amber-400 to-amber-300 p-8 md:p-12">
          <h2 className="text-2xl font-black text-emerald-950 md:text-3xl">عندك شيء للبيع؟</h2>
          <p className="mt-2 max-w-xl text-emerald-950/80">
            انشر إعلانك مجاناً خلال دقيقة، أو ميّزه ليظهر في أعلى الصفحة ويصل لعدد أكبر من المشترين.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/listings/new" data-magnet className="m-shine m-magnet rounded-xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-800">
              أضف إعلاناً مجاناً
            </Link>
            <Link href="/advertise" className="rounded-xl bg-white/70 px-6 py-3 font-bold text-emerald-950 hover:bg-white">
              تعرّف على الإعلانات المميزة
            </Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
