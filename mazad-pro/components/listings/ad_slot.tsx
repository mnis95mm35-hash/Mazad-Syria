import Link from 'next/link';

// مساحة إعلانية: استبدلها لاحقاً بإعلانات شركاء أو Google AdSense
export default function AdSlot() {
  return (
    <Link
      href="/advertise"
      className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-50 px-6 py-6 text-center transition hover:bg-amber-100"
    >
      <span className="text-xs font-bold tracking-wide text-amber-700">مساحة إعلانية</span>
      <span className="mt-1 text-lg font-extrabold text-emerald-950">أعلن هنا وصل إلى آلاف المشترين في سوريا</span>
      <span className="mt-1 text-sm text-gray-600">اطّلع على باقات الإعلانات ←</span>
    </Link>
  );
}
