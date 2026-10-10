import Link from 'next/link';
import { notFound } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ImageGallery from '@/components/listings/image_gallery';
import { categoryInfo } from '@/components/listings/listing_card';
import { listingService } from '@/lib/listing_service';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await listingService.getListing(Number(id));
  if (!listing) notFound();

  const cat = categoryInfo(listing.category);

  return (
    <MainLayout>
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
            <a
              href={`tel:${listing.sellerPhone}`}
              className="mt-4 block rounded-xl bg-emerald-900 py-3.5 text-center font-bold text-white transition hover:bg-emerald-800"
            >
              📞 اتصل بالبائع
            </a>
          )}
          <p className="mt-4 text-xs leading-6 text-gray-500">
            نصيحة: عاين السلعة شخصياً ولا ترسل مبالغ مقدماً قبل التأكد.
          </p>
        </aside>
      </div>
    </MainLayout>
  );
}
