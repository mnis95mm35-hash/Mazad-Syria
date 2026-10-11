import type { MetadataRoute } from 'next';
import { listingService } from '@/lib/listing_service';
import { SITE } from '@/lib/site_config';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE.url}/advertise`, changeFrequency: 'monthly', priority: 0.5 },
  ];
  try {
    const listings = await listingService.getSitemapEntries();
    for (const l of listings) {
      entries.push({
        url: `${SITE.url}/listings/${l.id}`,
        lastModified: l.createdAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (e) {
    console.error('sitemap: failed to load listings', e);
  }
  return entries;
}
