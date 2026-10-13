import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site_config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/listings/new', '/account', '/login', '/register'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
