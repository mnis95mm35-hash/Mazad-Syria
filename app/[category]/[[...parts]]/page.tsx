import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ListingCard, { categoryInfo } from '@/components/listings/listing_card';
import Pagination from '@/components/listings/pagination';
import SearchBar from '@/components/listings/search_bar';
import ExtraFilters from '@/components/listings/extra_filters';
import { EXTRA_FILTER_KEYS, extraFilterParams, parseExtraFilters, type ExtraFilterRaw } from '@/lib/attributes';
import { listingService } from '@/lib/listing_service';
import { CITIES } from '@/lib/sample_data';
import { SITE } from '@/lib/site_config';
import {
  browsePath,
  categoryExists,
  cityFromSlug,
  isCurrency,
  isValidSub,
  subLabel,
  subsOf,
  areasOf,
  isValidArea,
} from '@/lib/taxonomy';

type Params = { category: string; parts?: string[] };
type Search = ExtraFilterRaw & { q?: string; area?: string; minPrice?: string; maxPrice?: string; sort?: string; currency?: string; page?: string };

// يفسّر المسار: /cars  /cars/damascus  /cars/toyota  /cars/toyota/damascus
function resolve({ category, parts = [] }: Params) {
  if (!categoryExists(category) || parts.length > 2) return null;
  let sub: string | null = null;
  let city: string | null = null;
  const [a, b] = parts;
  if (a) {
    const cityA = cityFromSlug(a);
    if (cityA) {
      if (b) return null; // بعد المدينة لا شيء
      city = cityA;
    } else if (isValidSub(category, a)) {
      sub = a;
      if (b) {
        city = cityFromSlug(b);
        if (!city) return null;
      }
    } else {
      return null;
    }
  }
  return { category, sub, city };
}

function labels(r: { category: string; sub: string | null; city: string | null }) {
  const cat = categoryInfo(r.category);
  const sub = r.sub ? subLabel(r.category, r.sub) : null;
  const what = sub ?? cat.label;
  const title = r.city ? `${what} في ${r.city}` : `${what} في سوريا`;
  return { cat, sub, what, title };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const r = resolve(await params);
  if (!r) return { title: 'الصفحة غير موجودة', robots: { index: false } };
  const sp = await searchParams;
  const { title } = labels(r);
  const path = browsePath(r);
  const filtered = Boolean(
    sp.q || sp.area || sp.minPrice || sp.maxPrice || (sp.sort && sp.sort !== 'newest') || EXTRA_FILTER_KEYS.some((k) => sp[k]),
  );
  return {
    title,
    description: `تصفح إعلانات ${title} على ${SITE.name}: أحدث العروض بالأسعار والصور، وتواصل مباشرة مع البائعين.`,
    alternates: { canonical: path },
    // صفحات الفلاتر لا تُفهرس حتى لا تتكاثر نسخ مكررة
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, url: path, type: 'website' },
  };
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const r = resolve(await params);
  if (!r) notFound();
  const sp = await searchParams;
  const { q, area: areaParam, minPrice, maxPrice, sort, currency, page: pageParam } = sp;
  const extra = parseExtraFilters(sp, r.category);
  const extraRaw: ExtraFilterRaw = Object.fromEntries(EXTRA_FILTER_KEYS.map((k) => [k, sp[k]]));
  const area = r.city && areaParam && isValidArea(r.city, areaParam) ? areaParam : undefined;
  const toNum = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) ? n : undefined;
  };
  const sortKey = sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest';
  const cur = isCurrency(currency) ? currency : undefined;
  const pageNum = Math.max(Math.floor(Number(pageParam)) || 1, 1);
  const { cat, sub, what, title } = labels(r);
  const path = browsePath(r);

  const [results, facets] = await Promise.all([
    listingService.searchListings({
      q,
      category: r.category,
      subcategory: r.sub ?? undefined,
      city: r.city ?? undefined,
      area,
      minPrice: toNum(minPrice),
      maxPrice: toNum(maxPrice),
      sort: sortKey,
      currency: cur,
      page: pageNum,
      ...extra,
    }),
    listingService.getFacets().catch(() => []),
  ]);

  // روابط داخلية: الأقسام الفرعية والمدن التي فيها إعلانات
  const inCat = facets.filter((f) => f.category === r.category);
  const subsWithAds = subsOf(r.category).filter((s) => inCat.some((f) => f.subcategory === s.slug));
  const citiesWithAds = CITIES.filter((c) =>
    inCat.some((f) => f.city === c && (!r.sub || f.subcategory === r.sub)),
  );

  const breadcrumbs = [
    { name: SITE.name, url: SITE.url },
    { name: cat.label, url: `${SITE.url}${browsePath({ category: r.category })}` },
    ...(r.sub ? [{ name: sub ?? r.sub, url: `${SITE.url}${browsePath({ category: r.category, sub: r.sub })}` }] : []),
    ...(r.city ? [{ name: r.city, url: `${SITE.url}${path}` }] : []),
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.url })),
  };

  return (
    <MainLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <nav aria-label="مسار التنقل" className="text-sm text-gray-500">
        <Link href="/" className="hover:text-emerald-800">الرئيسية</Link>
        <span className="mx-2">/</span>
        <Link href={browsePath({ category: r.category })} className="hover:text-emerald-800">{cat.label}</Link>
        {sub && (
          <>
            <span className="mx-2">/</span>
            <Link href={browsePath({ category: r.category, sub: r.sub })} className="hover:text-emerald-800">{sub}</Link>
          </>
        )}
        {r.city && (
          <>
            <span className="mx-2">/</span>
            <span>{r.city}</span>
          </>
        )}
      </nav>

      <h1 className="mt-3 text-3xl font-black">
        {cat.icon} {title}
      </h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        {results.total > 0
          ? `${results.total} إعلان: تصفح أحدث عروض ${what}${r.city ? ` في ${r.city}` : ' في جميع المحافظات السورية'} وتواصل مباشرة مع البائعين.`
          : `لا توجد إعلانات ${what}${r.city ? ` في ${r.city}` : ''} حالياً.`}
      </p>

      {(subsWithAds.length > 0 || citiesWithAds.length > 0) && (
        <div className="mt-5 space-y-3">
          {subsWithAds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subsWithAds.map((s) => (
                <Link
                  key={s.slug}
                  href={browsePath({ category: r.category, sub: s.slug, city: r.city })}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold ring-1 ring-black/5 ${
                    r.sub === s.slug ? 'bg-emerald-900 text-white' : 'bg-white hover:bg-emerald-50'
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}
          {citiesWithAds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {citiesWithAds.map((c) => (
                <Link
                  key={c}
                  href={browsePath({ category: r.category, sub: r.sub, city: c })}
                  className={`rounded-full px-4 py-1.5 text-sm ring-1 ring-black/5 ${
                    r.city === c ? 'bg-emerald-900 text-white' : 'bg-white hover:bg-emerald-50'
                  }`}
                >
                  📍 {c}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-emerald-900 p-3">
        <SearchBar
          q={q}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sort={sortKey}
          currency={cur}
          action={path}
          lockPlace
          area={area}
          areaOptions={r.city ? areasOf(r.city) : undefined}
        >
          <ExtraFilters category={r.category} values={extraRaw} />
        </SearchBar>
      </div>

      <section className="mt-8">
        {results.items.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-black/5">
            لا توجد نتائج مطابقة.{' '}
            <Link href="/listings/new" className="font-bold text-emerald-800 hover:underline">كن أول من ينشر إعلاناً هنا</Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {results.items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
        <Pagination
          page={results.page}
          pageCount={results.pageCount}
          basePath={path}
          params={{
            q,
            area,
            minPrice,
            maxPrice,
            sort: sortKey === 'newest' ? undefined : sortKey,
            currency: cur,
            ...extraFilterParams(extraRaw, extra),
          }}
        />
      </section>
    </MainLayout>
  );
}
