import { prisma } from '@/lib/prisma';
import { SAMPLE_LISTINGS, type Listing } from '@/lib/sample_data';

export type ListingFilters = {
  q?: string;
  category?: string;
  city?: string;
};

function applyFilters(items: Listing[], f: ListingFilters) {
  const q = f.q?.trim().toLowerCase();
  return items.filter(
    (l) =>
      (!q || l.title.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q)) &&
      (!f.category || l.category === f.category) &&
      (!f.city || l.city === f.city),
  );
}

export const listingService = {
  async getListings(filters: ListingFilters = {}): Promise<Listing[]> {
    try {
      const rows = await prisma.listing.findMany({ orderBy: { createdAt: 'desc' } });
      if (rows.length > 0) return applyFilters(rows as Listing[], filters);
    } catch {
      // قاعدة البيانات غير جاهزة بعد: نستخدم بيانات تجريبية
    }
    return applyFilters(SAMPLE_LISTINGS, filters);
  },

  async getListing(id: number): Promise<Listing | null> {
    try {
      const row = await prisma.listing.findUnique({ where: { id } });
      if (row) return row as Listing;
    } catch {
      // نستخدم البيانات التجريبية
    }
    return SAMPLE_LISTINGS.find((l) => l.id === id) ?? null;
  },
};
