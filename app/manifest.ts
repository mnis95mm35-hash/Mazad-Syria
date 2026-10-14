import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site_config';

// يسمح بإضافة الموقع إلى الشاشة الرئيسية في الهاتف كتطبيق
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.tagline,
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#fafaf9',
    theme_color: '#064e3b',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
