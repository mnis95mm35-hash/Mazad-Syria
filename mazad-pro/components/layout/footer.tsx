import Link from 'next/link';
import { SITE } from '@/lib/site_config';
import { CATEGORIES } from '@/lib/sample_data';

export default function Footer() {
  return (
    <footer className="mt-16 bg-emerald-950 text-emerald-100">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-2xl font-extrabold text-white">{SITE.name}</p>
          <p className="mt-3 max-w-md text-sm leading-7 text-emerald-200/80">{SITE.tagline}</p>
        </div>

        <div>
          <p className="mb-3 font-bold text-white">الأقسام</p>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/?category=${c.slug}`} className="hover:text-amber-300">{c.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 font-bold text-white">للبائعين</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings/new" className="hover:text-amber-300">أضف إعلاناً</Link></li>
            <li><Link href="/advertise" className="hover:text-amber-300">الإعلانات المميزة</Link></li>
            <li>
              <a href={`https://wa.me/${SITE.whatsapp}`} className="hover:text-amber-300">تواصل عبر واتساب</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-emerald-900 py-4 text-center text-xs text-emerald-300/70">
        © {new Date().getFullYear()} {SITE.name}. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
