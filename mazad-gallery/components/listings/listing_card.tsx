import Link from 'next/link';
import { CATEGORIES, type Listing } from '@/lib/sample_data';

export function categoryInfo(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? { slug, label: slug, icon: '📦' };
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const cat = categoryInfo(listing.category);
  const cover = listing.images?.[0] ?? listing.imageUrl;
  const count = listing.images?.length ?? 0;
  return (
    <Link
      href={`/listings/${listing.id}`}
      className={`group relative block overflow-hidden rounded-2xl bg-white transition duration-200 hover:-translate-y-1 hover:shadow-xl ${
        listing.isFeatured ? 'ring-2 ring-amber-400' : 'ring-1 ring-black/5'
      }`}
    >
      {listing.isFeatured && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-emerald-950 shadow">
          ★ مميز
        </span>
      )}
      {count > 1 && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
          📷 {count}
        </span>
      )}
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={listing.title}
          className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 text-6xl">
          {cat.icon}
        </div>
      )}
      <div className="p-4">
        <p className="text-xl font-extrabold text-emerald-800">${listing.price.toLocaleString('en-US')}</p>
        <h3 className="mt-1 line-clamp-2 font-bold leading-snug">{listing.title}</h3>
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800">{cat.label}</span>
          <span>📍 {listing.city}</span>
        </p>
      </div>
    </Link>
  );
}
