import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-emerald-700">
          مزاد سوريا
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-gray-700">
          <Link href="/" className="hover:text-emerald-700">الرئيسية</Link>
          <Link href="/?category=cars" className="hover:text-emerald-700">سيارات</Link>
          <Link href="/?category=real-estate" className="hover:text-emerald-700">عقارات</Link>
          <Link
            href="/listings/new"
            className="bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700"
          >
            أضف إعلاناً
          </Link>
        </nav>
      </div>
    </header>
  );
}
