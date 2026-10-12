import type { Metadata } from 'next';
import Link from 'next/link';
import MainLayout from '@/components/layout/main_layout';
import { dealers } from '@/lib/dealers_service';
import { SITE } from '@/lib/site_config';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'المعارض والتجار',
  description: `دليل المعارض والمحلات والتجار الموثوقين على ${SITE.name}: تصفح إعلاناتهم وتواصل معهم مباشرة.`,
  alternates: { canonical: '/dealers' },
};

export default async function DealersPage() {
  const list = await dealers.listLive().catch(() => []);
  return (
    <MainLayout>
      <h1 className="text-3xl font-black">المعارض والتجار</h1>
      <p className="mt-2 text-gray-600">معارض ومحلات لها صفحات خاصة بإعلاناتها.</p>

      {list.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-black/5">
          لا توجد معارض بعد.{' '}
          <Link href="/account/dealer" className="font-bold text-emerald-800 hover:underline">سجّل معرضك</Link>
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <Link
              key={d.id}
              href={`/dealer/${d.slug}`}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition hover:shadow-lg"
            >
              {d.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-800 text-2xl font-black text-amber-300">
                  {d.name.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-extrabold">
                  {d.name} {d.verified && <span className="text-sky-700">✔</span>}
                </span>
                {d.city && <span className="block text-sm text-gray-500">📍 {d.city}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
