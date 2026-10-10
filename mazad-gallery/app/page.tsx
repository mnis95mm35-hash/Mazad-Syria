import Link from 'next/link';
import MainLayout from '@/components/layout/main_layout';
import ListingCard from '@/components/listings/listing_card';
import SearchBar from '@/components/listings/search_bar';
import AdSlot from '@/components/listings/ad_slot';
import { listingService } from '@/lib/listing_service';
import { CATEGORIES } from '@/lib/sample_data';

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
  }>;
}) {
  const { q, category, city, minPrice, maxPrice, sort } = await searchParams;
  const toNum = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) ? n : undefined;
  };
  const sortKey = sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest';
  const listings = await listingService.getListings({
    q,
    category,
    city,
    minPrice: toNum(minPrice),
    maxPrice: toNum(maxPrice),
    sort: sortKey,
  });
  const filtering = Boolean(q || category || city || minPrice || maxPrice || sortKey !== 'newest');
  const featured = filtering ? [] : listings.filter((l) => l.isFeatured);
  const rest = filtering ? listings : listings.filter((l) => !l.isFeatured);

  return (
    <MainLayout bare>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
            بِع واشترِ بسهولة في <span className="text-amber-300">كل سوريا</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-100/90">
            سيارات، عقارات، إلكترونيات وأكثر. انشر إعلانك مجاناً وتواصل مباشرة مع المشترين.
          </p>
          <div className="mt-8 rounded-2xl bg-white/10 p-3 backdrop-blur ring-1 ring-white/20">
            <SearchBar
              q={q}
              category={category}
              city={city}
              minPrice={minPrice}
              maxPrice={maxPrice}
              sort={sortKey}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-emerald-100">
            <span className="rounded-full bg-white/10 px-4 py-1.5">✓ النشر مجاني</span>
            <span className="rounded-full bg-white/10 px-4 py-1.5">✓ تواصل مباشر</span>
            <span className="rounded-full bg-white/10 px-4 py-1.5">✓ جميع المحافظات</span>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        {/* Categories */}
        <section className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/?category=${c.slug}`}
              className={`rounded-2xl bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-lg ${
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
              <h2 className="text-2xl font-extrabold">★ إعلانات مميزة</h2>
              <Link href="/advertise" className="text-sm font-semibold text-emerald-800 hover:underline">
                كيف أميّز إعلاني؟
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          <AdSlot />
        </div>

        {/* Latest */}
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-extrabold">
            {filtering ? `نتائج البحث (${listings.length})` : 'أحدث الإعلانات'}
          </h2>
          {rest.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-black/5">
              لا توجد نتائج مطابقة. جرّب تغيير البحث أو الفلاتر.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rest.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        {/* Seller CTA */}
        <section className="mt-14 overflow-hidden rounded-3xl bg-gradient-to-l from-amber-400 to-amber-300 p-8 md:p-12">
          <h2 className="text-2xl font-black text-emerald-950 md:text-3xl">عندك شيء للبيع؟</h2>
          <p className="mt-2 max-w-xl text-emerald-950/80">
            انشر إعلانك مجاناً خلال دقيقة، أو ميّزه ليظهر في أعلى الصفحة ويصل لعدد أكبر من المشترين.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/listings/new" className="rounded-xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-800">
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
