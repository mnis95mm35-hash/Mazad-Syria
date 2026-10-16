import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ListingCard from '@/components/listings/listing_card';
import { favorites } from '@/lib/favorites_service';
import { listingService } from '@/lib/listing_service';
import { getCurrentUser } from '@/lib/supabase_auth';

export const metadata: Metadata = { title: 'المفضلة', robots: { index: false } };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/favorites');
  const ids = await favorites.listIds(user.id);
  const items = await listingService.getByIds(ids);

  return (
    <MainLayout>
      <h1 className="text-3xl font-black">♥ مفضلتي</h1>
      <p className="mt-1 text-sm text-gray-500">الإعلانات التي حفظتها. المنتهية أو المحذوفة تختفي تلقائياً.</p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-black/5">
          <p>لا توجد إعلانات في المفضلة بعد.</p>
          <p className="mt-2 text-sm">اضغط على ♡ في أي إعلان لحفظه هنا.</p>
          <Link href="/" className="mt-4 inline-block rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-emerald-950 hover:bg-amber-300">
            تصفّح الإعلانات
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </MainLayout>
  );
}
