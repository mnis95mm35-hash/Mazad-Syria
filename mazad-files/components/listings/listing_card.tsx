import Link from 'next/link';
import { CATEGORIES, type Listing } from '@/lib/sample_data';

export function categoryInfo(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? { slug, label: slug, icon: '📦' };
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const cat = categoryInfo(listing.category);
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition block"
    >
      <div className="h-40 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-5xl">
        {cat.icon}
      </div>
      <div className="p-4">
        <p className="text-emerald-700 font-bold text-lg">${listing.price.toLocaleString('en-US')}</p>
        <h3 className="font-semibold mt-1 line-clamp-2">{listing.title}</h3>
        <p className="text-sm text-gray-500 mt-2">
          {cat.label} · {listing.city}
        </p>
      </div>
    </Link>
  );
}
