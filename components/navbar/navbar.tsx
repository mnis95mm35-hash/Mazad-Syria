import Link from 'next/link';
import { SITE } from '@/lib/site_config';
import { getCurrentUser } from '@/lib/supabase_auth';

export default async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="m-nav sticky top-0 z-20 border-b border-emerald-900/10 bg-white/90 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="m-logo flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-lg font-black text-amber-300">
            م
          </span>
          <span className="text-xl font-extrabold text-emerald-900">{SITE.name}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-700 md:flex">
          <Link href="/" className="hover:text-emerald-800">الرئيسية</Link>
          <Link href="/cars" className="hover:text-emerald-800">سيارات</Link>
          <Link href="/real-estate" className="hover:text-emerald-800">عقارات</Link>
          <Link href="/electronics" className="hover:text-emerald-800">إلكترونيات</Link>
          <Link href="/dealers" className="hover:text-emerald-800">المعارض</Link>
          <Link href="/advertise" className="hover:text-emerald-800">أعلن معنا</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/favorites" aria-label="المفضلة" title="المفضلة" className="rounded-xl px-2.5 py-2.5 text-lg text-rose-600 hover:bg-rose-50">
            ♥
          </Link>
          <Link
            href={user ? '/account' : '/login'}
            className="rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50"
          >
            {user ? 'حسابي' : 'دخول'}
          </Link>
          <Link
            href="/listings/new"
            data-magnet className="m-shine m-magnet rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-amber-300"
          >
            + أضف إعلاناً
          </Link>
        </div>
      </div>
    </header>
  );
}
