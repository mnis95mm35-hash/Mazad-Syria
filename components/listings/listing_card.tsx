import Link from 'next/link';
import { CATEGORIES, type Listing } from '@/lib/sample_data';
import { formatPrice } from '@/lib/format';
import { thumbUrl } from '@/lib/images';
import { cardChips } from '@/lib/attributes';
import FavButton from '@/components/listings/fav_button';

export function categoryInfo(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? { slug, label: slug, icon: '📦' };
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const cat = categoryInfo(listing.category);
  const cover = listing.images?.[0] ?? listing.imageUrl;
  const count = listing.images?.length ?? 0;
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white transition duration-200 hover:-translate-y-1 hover:shadow-xl ${
        listing.isFeatured ? 'ring-2 ring-amber-400' : 'ring-1 ring-black/5'
      }`}
    >
      <div className="absolute left-3 top-3 z-20">
        <FavButton id={listing.id} />
      </div>
      {listing.soldAt && (
        <span className="absolute inset-x-0 top-16 z-10 bg-red-600/90 py-1.5 text-center text-sm font-extrabold text-white">تم البيع</span>
      )}
      <Link href={`/listings/${listing.id}`} className="block">
      {listing.isFeatured && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-emerald-950 shadow">
          ★ مميز
        </span>
      )}
      {count > 1 && (
        <span className="absolute left-3 top-[8.4rem] z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
          📷 {count}
        </span>
      )}
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl(cover) ?? cover}
          alt={listing.title}
          loading="lazy"
          decoding="async"
          className="h-44 w-full bg-stone-100 object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 text-6xl">
          {cat.icon}
        </div>
      )}
      <div className="p-4">
        <p className="text-xl font-extrabold text-emerald-800">{formatPrice(listing.price, listing.currency)}</p>
        <h3 className="mt-1 line-clamp-2 font-bold leading-snug">{listing.title}</h3>
        {cardChips(listing).length > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-gray-600">{cardChips(listing).join(' · ')}</p>
        )}
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800">{cat.label}</span>
          <span>📍 {listing.city}{listing.area ? ` - ${listing.area}` : ''}</span>
        </p>
      </div>
      </Link>
    </div>
  );
}
