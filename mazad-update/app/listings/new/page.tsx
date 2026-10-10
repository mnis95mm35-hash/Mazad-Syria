import MainLayout from '@/components/layout/main_layout';
import NewListingForm from '@/components/listings/new_listing_form';

export default function NewListingPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">أضف إعلاناً جديداً</h1>
      <NewListingForm />
    </MainLayout>
  );
}
