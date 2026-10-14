import MainLayout from '@/components/layout/main_layout';

// قالب موحّد للصفحات النصية (من نحن، الشروط، الخصوصية...)
export default function StaticPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 ring-1 ring-black/5 md:p-10">
        <h1 className="text-3xl font-black text-emerald-950">{title}</h1>
        {updated && <p className="mt-1 text-sm text-gray-500">آخر تحديث: {updated}</p>}
        <div className="mt-6 space-y-4 leading-8 text-gray-700 [&_a]:font-bold [&_a]:text-emerald-800 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-emerald-950 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pr-6">
          {children}
        </div>
      </article>
    </MainLayout>
  );
}
