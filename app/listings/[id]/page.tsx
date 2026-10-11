import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ImageGallery from '@/components/listings/image_gallery';
import { categoryInfo } from '@/components/listings/listing_card';
import { listingService } from '@/lib/listing_service';
import { toWhatsAppNumber } from '@/lib/phone';
import ReportButton from '@/components/listings/report_button';
import { getCurrentUser } from '@/lib/supabase_auth';
import { SITE } from '@/lib/site_config';

const validId = (id: string) => /^[1-9][0-9]{0,14}$/.test(id);

// نستعلم مرة واحدة لكل طلب حتى لو استُخدم في الميتاداتا والصفحة
const loadListing = cache(async (id: string) => (validId(id) ? listingService.getListing(Number(id)) : null));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await loadListing(id);
  if (!l) return { title: 'الإعلان غير موجود', robots: { index: false } };
  const desc = (l.description || `${l.title} للبيع في ${l.city}`).replace(/\s+/g, ' ').slice(0, 160);
  const title = `${l.title} - ${l.city}`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/listings/${l.id}` },
    openGraph: {
      title,
      description: desc,
      url: `/listings/${l.id}`,
      type: 'website',
      images: l.images && l.images[0] ? [{ url: l.images[0] }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // رقم غير صالح في الرابط يعني 404 وليس خطأ 500
  const listing = await loadListing(id);
  if (!listing) notFound();

  const user = await getCurrentUser();
  const isOwner = Boolean(user && listing.userId === user.id);
  const cat = categoryInfo(listing.category);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description ?? undefined,
    image: listing.images && listing.images.length ? listing.images : undefined,
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE.url}/listings/${listing.id}`,
    },
  };

  return (
    <MainLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline">← العودة للإعلانات</Link>

      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
          <ImageGallery images={listing.images ?? []} alt={listing.title} icon={cat.icon} />
          <div className="p-6">
            {listing.isFeatured && (
              <span className="mb-3 inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-emerald-950">
                ★ إعلان مميز
              </span>
            )}
            <h1 className="text-2xl font-black md:text-3xl">{listing.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{cat.label}</span>
              <span>📍 {listing.city}</span>
            </p>
            <h2 className="mb-2 mt-8 text-lg font-extrabold">الوصف</h2>
            <p className="whitespace-pre-line leading-8 text-gray-700">
              {listing.description || 'لا يوجد وصف.'}
            </p>
          </div>
        </div>

        <aside className="h-fit rounded-3xl bg-white p-6 ring-1 ring-black/5 md:sticky md:top-24">
          <p className="text-4xl font-black text-emerald-800">${listing.price.toLocaleString('en-US')}</p>
          <div className="mt-5 rounded-2xl bg-stone-50 p-4">
            <p className="text-sm text-gray-500">البائع</p>
            <p className="text-lg font-bold">{listing.sellerName}</p>
          </div>
          {listing.sellerPhone && (
            <div className="mt-4 space-y-2">
              <a
                href={`https://wa.me/${toWhatsAppNumber(listing.sellerPhone)}?text=${encodeURIComponent(`مرحباً، أنا مهتم بإعلانك "${listing.title}" على مزاد سوريا`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl bg-green-600 py-3.5 text-center font-bold text-white transition hover:bg-green-700"
              >
                💬 تواصل عبر واتساب
              </a>
              <a
                href={`tel:${listing.sellerPhone}`}
                className="block rounded-xl bg-emerald-900 py-3.5 text-center font-bold text-white transition hover:bg-emerald-800"
              >
                📞 اتصل بالبائع
              </a>
            </div>
          )}
          <p className="mt-4 text-xs leading-6 text-gray-500">
            نصيحة: عاين السلعة شخصياً ولا ترسل مبالغ مقدماً قبل التأكد.
          </p>
          {isOwner ? (
            <Link href={`/listings/${listing.id}/edit`} className="mt-4 block rounded-xl bg-stone-100 py-3 text-center text-sm font-bold hover:bg-stone-200">
              ✏️ تعديل إعلانك
            </Link>
          ) : (
            <ReportButton id={listing.id} />
          )}
        </aside>
      </div>
    </MainLayout>
  );
}
