import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { SITE } from '@/lib/site_config';
import MotionFX from '@/components/motion/motion_fx';

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: 'مزاد سوريا | إعلانات مبوّبة للبيع والشراء',
  description: 'بيع واشترِ السيارات والعقارات والإلكترونيات والمزيد في جميع المحافظات السورية.',
  openGraph: { siteName: SITE.name, locale: 'ar_SY', type: 'website' },
  // رمز التحقق من Google Search Console (اختياري): يُضبط في متغيرات البيئة
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.className} antialiased bg-stone-50 text-gray-900`}>
        <div aria-hidden="true" className="m-progress" />
        <MotionFX />
        {children}
      </body>
    </html>
  );
}
