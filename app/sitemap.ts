import type { MetadataRoute } from 'next';
import { dealers } from '@/lib/dealers_service';
import { listingService } from '@/lib/listing_service';
import { CATEGORIES } from '@/lib/sample_data';
import { SITE } from '@/lib/site_config';
import { browsePath } from '@/lib/taxonomy';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE.url}/advertise`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE.url}/dealers`, changeFrequency: 'daily', priority: 0.6 },
    ...['about', 'safety', 'terms', 'privacy', 'contact'].map((p) => ({
      url: `${SITE.url}/${p}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
    ...CATEGORIES.map((c) => ({
      url: `${SITE.url}${browsePath({ category: c.slug })}`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
  ];
  try {
    // صفحات (قسم/فرعي/مدينة) التي فيها إعلانات فقط، حتى لا نقدّم صفحات فارغة لمحركات البحث
    const facets = await listingService.getFacets();
    const seen = new Set<string>();
    const add = (path: string) => {
      if (seen.has(path)) return;
      seen.add(path);
      entries.push({ url: `${SITE.url}${path}`, changeFrequency: 'daily', priority: 0.8 });
    };
    for (const f of facets) {
      add(browsePath({ category: f.category, city: f.city }));
      if (f.subcategory) {
        add(browsePath({ category: f.category, sub: f.subcategory }));
        add(browsePath({ category: f.category, sub: f.subcategory, city: f.city }));
      }
    }
    const listings = await listingService.getSitemapEntries();
    for (const l of listings) {
      entries.push({
        url: `${SITE.url}/listings/${l.id}`,
        lastModified: l.createdAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    for (const d of await dealers.listLive()) {
      entries.push({ url: `${SITE.url}/dealer/${d.slug}`, changeFrequency: 'daily', priority: 0.6 });
    }
  } catch (e) {
    console.error('sitemap: failed to load listings', e);
  }
  return entries;
}
