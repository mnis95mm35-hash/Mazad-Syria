import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { SITE } from '@/lib/site_config';

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: 'مزاد سوريا | إعلانات مبوّبة للبيع والشراء',
  description: 'بيع واشترِ السيارات والعقارات والإلكترونيات والمزيد في جميع المحافظات السورية.',
  openGraph: { siteName: SITE.name, locale: 'ar_SY', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} antialiased bg-stone-50 text-gray-900`}>{children}</body>
    </html>
  );
}
