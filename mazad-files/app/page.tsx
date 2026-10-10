import Link from 'next/link';
import MainLayout from '@/components/layout/main_layout';
import ListingCard from '@/components/listings/listing_card';
import SearchBar from '@/components/listings/search_bar';
import { listingService } from '@/lib/listing_service';
import { CATEGORIES } from '@/lib/sample_data';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; city?: string }>;
}) {
  const { q, category, city } = await searchParams;
  const listings = await listingService.getListings({ q, category, city });

  return (
    <MainLayout>
      <SearchBar q={q} category={category} city={city} />

      <section className="mt-6 grid grid-cols-3 md:grid-cols-6 gap-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/?category=${c.slug}`}
            className={`bg-white border rounded-xl p-4 text-center hover:shadow ${
              category === c.slug ? 'border-emerald-600' : 'border-gray-200'
            }`}
          >
            <div className="text-3xl">{c.icon}</div>
            <div className="text-sm mt-1 font-medium">{c.label}</div>
          </Link>
        ))}
      </section>

      <h2 className="text-xl font-bold mt-8 mb-4">أحدث الإعلانات ({listings.length})</h2>

      {listings.length === 0 ? (
        <p className="text-gray-500">لا توجد نتائج مطابقة.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </MainLayout>
  );
}
