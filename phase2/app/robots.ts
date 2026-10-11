import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site_config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/listings/new'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
