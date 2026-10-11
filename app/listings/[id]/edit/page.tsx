import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ListingForm from '@/components/listings/new_listing_form';
import { listingService } from '@/lib/listing_service';
import { getCurrentUser } from '@/lib/supabase_auth';

export const metadata: Metadata = { title: 'تعديل الإعلان', robots: { index: false } };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9][0-9]{0,14}$/.test(id)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/listings/${id}/edit`);
  const listing = await listingService.getListing(Number(id), { includeInactive: true });
  if (!listing || listing.userId !== user.id) notFound();
  if (listing.status === 'blocked') redirect('/account');

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">تعديل الإعلان</h1>
      <ListingForm listing={listing} />
    </MainLayout>
  );
}
