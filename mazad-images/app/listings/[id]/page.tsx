import Link from 'next/link';
import { notFound } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import { categoryInfo } from '@/components/listings/listing_card';
import { listingService } from '@/lib/listing_service';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await listingService.getListing(Number(id));
  if (!listing) notFound();

  const cat = categoryInfo(listing.category);

  return (
    <MainLayout>
      <Link href="/" className="text-emerald-700 text-sm">← العودة للإعلانات</Link>
      <div className="grid md:grid-cols-3 gap-6 mt-4">
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.imageUrl} alt={listing.title} className="h-72 w-full object-cover" />
          ) : (
            <div className="h-72 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-8xl">
              {cat.icon}
            </div>
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{cat.label} · {listing.city}</p>
            <h2 className="font-semibold mt-6 mb-2">الوصف</h2>
            <p className="text-gray-700 leading-7">{listing.description}</p>
          </div>
        </div>
        <aside className="bg-white border border-gray-200 rounded-xl p-6 h-fit">
          <p className="text-3xl font-extrabold text-emerald-700">${listing.price.toLocaleString('en-US')}</p>
          <p className="mt-4 text-gray-600">البائع: <b>{listing.sellerName}</b></p>
          {listing.sellerPhone && (
            <a
              href={`tel:${listing.sellerPhone}`}
              className="block text-center bg-emerald-600 text-white rounded-lg py-3 mt-4 hover:bg-emerald-700"
            >
              اتصل بالبائع
            </a>
          )}
        </aside>
      </div>
    </MainLayout>
  );
}
