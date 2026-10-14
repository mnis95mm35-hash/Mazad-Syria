import Link from 'next/link';
import MainLayout from '@/components/layout/main_layout';

export const metadata = { title: 'الصفحة غير موجودة', robots: { index: false } };

export default function NotFound() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center ring-1 ring-black/5">
        <p className="text-7xl font-black text-emerald-800">404</p>
        <h1 className="mt-4 text-2xl font-extrabold">لم نعثر على هذه الصفحة</h1>
        <p className="mt-2 text-gray-600">
          ربما انتهت مدة الإعلان أو حُذف، أو أن الرابط غير صحيح. جرّب البحث أو تصفّح الأقسام.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-800">
            الصفحة الرئيسية
          </Link>
          <Link href="/listings/new" className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-emerald-950 hover:bg-amber-300">
            أضف إعلاناً
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
