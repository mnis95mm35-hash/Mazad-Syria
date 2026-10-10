import AddAdForm from "@/components/admin/add_ad_form";
import MainLayout from "@/components/layout/main_layout";

export default function AddAdPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">إضافة إعلان جديد</h1>
        <AddAdForm />
      </div>
    </MainLayout>
  );
}