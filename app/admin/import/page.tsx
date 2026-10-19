import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import ImportForm from '@/components/admin/import_form';
import PostsImport from '@/components/admin/posts_import';
import { isAdmin } from '@/lib/admin_auth';
import { CATEGORIES, CITIES } from '@/lib/sample_data';

export const metadata: Metadata = { title: 'استيراد إعلانات', robots: { index: false } };

export default async function ImportPage() {
  if (!(await isAdmin())) redirect('/admin');
  return (
    <MainLayout>
      <Link href="/admin" className="text-sm font-semibold text-emerald-800 hover:underline">← لوحة الإدارة</Link>
      <h1 className="mt-3 text-3xl font-black">استيراد إعلانات جماعي</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
        لإعلانات المعارض والتجار الذين وافقوا على نشرها عندنا فقط. تُنشر مباشرة بدون مراجعة وبدون صور (يضيفها صاحب الحساب لاحقاً من «تعديل»).
        حتى 100 إعلان في المرة. ابدأ دائماً بـ «معاينة وفحص» لترى الأخطاء قبل النشر.
      </p>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
          <h2 className="mb-1 text-xl font-extrabold">من منشورات</h2>
          <p className="mb-4 text-sm text-gray-600">
            الصق منشورات أرسلها لك أصحابها (من واتساب أو من صفحاتهم بموافقتهم). يُحلَّل كل منشور إلى بطاقة تراجعها وتعدّلها قبل النشر.
            تُفصل المنشورات بترقيم 1 2 3 أو بسطر --- أو بسطر فارغ.
          </p>
          <PostsImport />
        </section>

        <details className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
          <summary className="cursor-pointer text-xl font-extrabold">من جدول (Excel أو CSV)</summary>
          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <ImportForm />
            <aside className="h-fit space-y-3 text-sm leading-7">
              <h3 className="font-extrabold">الأعمدة المقبولة</h3>
              <p><b>مطلوبة:</b> العنوان، السعر، القسم، المحافظة، الهاتف (أو هاتف افتراضي)</p>
              <p><b>اختيارية:</b> العملة (USD أو SYP)، الوصف، المنطقة، القسم الفرعي، السنة، الكيلومترات، الغرف، المساحة</p>
              <p><b>الأقسام:</b> {CATEGORIES.map((c) => c.label).join('، ')}</p>
              <p><b>المحافظات:</b> {CITIES.join('، ')}</p>
            </aside>
          </div>
        </details>
      </div>
    </MainLayout>
  );
}
