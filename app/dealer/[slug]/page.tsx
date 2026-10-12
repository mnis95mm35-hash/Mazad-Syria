import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ListingCard from '@/components/listings/listing_card';
import Pagination from '@/components/listings/pagination';
import { dealers, liveOrNull } from '@/lib/dealers_service';
import { listingService } from '@/lib/listing_service';
import { toWhatsAppNumber } from '@/lib/phone';
import { SITE } from '@/lib/site_config';
import { SLUG_RE } from '@/lib/dealer_form';

// صفحة التاجر تظهر للعامة فقط إن كان مفعّلاً واشتراكه ساري
const loadDealer = cache(async (slug: string) => {
  if (!SLUG_RE.test(slug) || slug.length > 40) return null;
  const d = await dealers.getBySlug(slug);
  return liveOrNull(d);
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await loadDealer(slug);
  if (!d) return { title: 'المعرض غير موجود', robots: { index: false } };
  const desc = (d.description || `إعلانات ${d.name}${d.city ? ` في ${d.city}` : ''} على ${SITE.name}`)
    .replace(/\s+/g, ' ')
    .slice(0, 160);
  return {
    title: d.name,
    description: desc,
    alternates: { canonical: `/dealer/${d.slug}` },
    openGraph: {
      title: d.name,
      description: desc,
      url: `/dealer/${d.slug}`,
      type: 'website',
      images: d.logoUrl ? [{ url: d.logoUrl }] : undefined,
    },
  };
}

export default async function DealerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const d = await loadDealer(slug);
  if (!d) notFound();
  const { page } = await searchParams;
  const pageNum = Math.max(Math.floor(Number(page)) || 1, 1);
  const results = await listingService.searchListings({ userId: d.userId, page: pageNum });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: d.name,
    url: `${SITE.url}/dealer/${d.slug}`,
    ...(d.description ? { description: d.description } : {}),
    ...(d.logoUrl ? { image: d.logoUrl } : {}),
    ...(d.phone ? { telephone: d.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'SY',
      ...(d.city ? { addressRegion: d.city } : {}),
      ...(d.address ? { streetAddress: d.address } : {}),
    },
  };
  const wa = d.phone ? toWhatsAppNumber(d.phone) : null;

  return (
    <MainLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <nav aria-label="مسار التنقل" className="text-sm text-gray-500">
        <Link href="/" className="hover:text-emerald-800">الرئيسية</Link>
        <span className="mx-2">/</span>
        <Link href="/dealers" className="hover:text-emerald-800">المعارض</Link>
        <span className="mx-2">/</span>
        <span>{d.name}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-center gap-5 rounded-3xl bg-white p-6 ring-1 ring-black/5">
        {d.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.logoUrl} alt={d.name} className="h-24 w-24 rounded-2xl object-cover ring-1 ring-black/10" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-800 text-4xl font-black text-amber-300">
            {d.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-black">
            {d.name}
            {d.verified && (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">✔ موثّق</span>
            )}
          </h1>
          {(d.city || d.address) && (
            <p className="mt-1 text-gray-600">📍 {[d.city, d.address].filter(Boolean).join(' - ')}</p>
          )}
          {d.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-gray-700">{d.description}</p>}
        </div>
        {d.phone && (
          <div className="flex flex-wrap gap-2">
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-green-600 px-5 py-2.5 font-bold text-white hover:bg-green-700"
              >
                💬 واتساب
              </a>
            )}
            <a href={`tel:${d.phone}`} className="rounded-xl bg-emerald-900 px-5 py-2.5 font-bold text-white hover:bg-emerald-800">
              📞 اتصال
            </a>
          </div>
        )}
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-extrabold">إعلانات المعرض ({results.total})</h2>
        {results.items.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-black/5">لا توجد إعلانات فعّالة حالياً.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {results.items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
        <Pagination page={results.page} pageCount={results.pageCount} basePath={`/dealer/${d.slug}`} params={{}} />
      </section>
    </MainLayout>
  );
}
