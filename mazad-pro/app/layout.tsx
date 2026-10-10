import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'مزاد سوريا | إعلانات مبوّبة للبيع والشراء',
  description: 'بيع واشترِ السيارات والعقارات والإلكترونيات والمزيد في جميع المحافظات السورية.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} antialiased bg-stone-50 text-gray-900`}>{children}</body>
    </html>
  );
}
