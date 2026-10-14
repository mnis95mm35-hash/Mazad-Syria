import Link from 'next/link';
import { SITE } from '@/lib/site_config';
import { CATEGORIES } from '@/lib/sample_data';

export default function Footer() {
  return (
    <footer className="mt-16 overflow-hidden bg-emerald-950 text-emerald-100">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <p className="text-2xl font-extrabold text-white">{SITE.name}</p>
          <p className="mt-3 max-w-md text-sm leading-7 text-emerald-200/80">{SITE.tagline}</p>
        </div>

        <div>
          <p className="mb-3 font-bold text-white">الأقسام</p>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}`} className="m-link hover:text-amber-300">{c.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 font-bold text-white">للبائعين</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings/new" className="m-link hover:text-amber-300">أضف إعلاناً</Link></li>
            <li><Link href="/account/dealer" className="m-link hover:text-amber-300">حساب تاجر / معرض</Link></li>
            <li><Link href="/dealers" className="m-link hover:text-amber-300">دليل المعارض</Link></li>
            <li><Link href="/advertise" className="m-link hover:text-amber-300">الإعلانات المميزة</Link></li>
            <li>
              <a href={`https://wa.me/${SITE.whatsapp}`} className="m-link hover:text-amber-300">تواصل عبر واتساب</a>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 font-bold text-white">عن الموقع</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="m-link hover:text-amber-300">من نحن</Link></li>
            <li><Link href="/safety" className="m-link hover:text-amber-300">نصائح الأمان</Link></li>
            <li><Link href="/terms" className="m-link hover:text-amber-300">شروط الاستخدام</Link></li>
            <li><Link href="/privacy" className="m-link hover:text-amber-300">سياسة الخصوصية</Link></li>
            <li><Link href="/contact" className="m-link hover:text-amber-300">اتصل بنا</Link></li>
          </ul>
        </div>
      </div>
      <p
        aria-hidden="true"
        className="select-none text-center text-[22vw] font-black leading-none text-emerald-900/60 md:text-[11rem]"
      >
        {SITE.name}
      </p>
      <div className="border-t border-emerald-900 py-4 text-center text-xs text-emerald-300/70">
        © {new Date().getFullYear()} {SITE.name}. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
