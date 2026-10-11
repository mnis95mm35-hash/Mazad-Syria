import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import NewListingForm from '@/components/listings/new_listing_form';
import { getCurrentUser } from '@/lib/supabase_auth';

export default async function NewListingPage() {
  if (!(await getCurrentUser())) redirect('/login?next=/listings/new');
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">أضف إعلاناً جديداً</h1>
      <NewListingForm />
    </MainLayout>
  );
}
