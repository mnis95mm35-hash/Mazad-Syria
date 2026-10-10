import { promises as fs } from 'fs';
import path from 'path';
import { SAMPLE_LISTINGS, type Listing } from '@/lib/sample_data';

export type ListingFilters = {
  q?: string;
  category?: string;
  city?: string;
};

export type NewListingInput = {
  title: string;
  description: string | null;
  price: number;
  category: string;
  city: string;
  sellerName: string;
  sellerPhone: string | null;
};

const FILE_PATH = path.join(process.cwd(), 'data', 'listings.json');

function applyFilters(items: Listing[], f: ListingFilters) {
  const q = f.q?.trim().toLowerCase();
  return items.filter(
    (l) =>
      (!q || l.title.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q)) &&
      (!f.category || l.category === f.category) &&
      (!f.city || l.city === f.city),
  );
}

// تحميل Prisma عند الحاجة فقط، حتى لا يتعطل الموقع إن لم يكن العميل مولَّداً بعد
async function getPrisma() {
  const mod = await import('@/lib/prisma');
  return mod.prisma;
}

// ملف محلي احتياطي: يُستخدم عندما تكون قاعدة البيانات غير جاهزة
async function readFileStore(): Promise<Listing[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const rows = JSON.parse(raw) as Listing[];
    return rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
  } catch {
    return SAMPLE_LISTINGS;
  }
}

async function writeFileStore(items: Listing[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
}

export const listingService = {
  async getListings(filters: ListingFilters = {}): Promise<Listing[]> {
    try {
      const prisma = await getPrisma();
      const rows = await prisma.listing.findMany({ orderBy: { createdAt: 'desc' } });
      if (rows.length > 0) return applyFilters(rows as Listing[], filters);
    } catch {
      // قاعدة البيانات غير جاهزة: ننتقل للملف المحلي
    }
    const items = await readFileStore();
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return applyFilters(items, filters);
  },

  async getListing(id: number): Promise<Listing | null> {
    try {
      const prisma = await getPrisma();
      const row = await prisma.listing.findUnique({ where: { id } });
      if (row) return row as Listing;
    } catch {
      // ننتقل للملف المحلي
    }
    const items = await readFileStore();
    return items.find((l) => l.id === id) ?? null;
  },

  async createListing(input: NewListingInput): Promise<number> {
    try {
      const prisma = await getPrisma();
      const row = await prisma.listing.create({ data: { ...input, imageUrl: null } });
      return row.id;
    } catch {
      // قاعدة البيانات غير جاهزة: نحفظ في الملف المحلي
    }
    const items = await readFileStore();
    const id = items.reduce((m, l) => Math.max(m, l.id), 0) + 1;
    items.push({ id, ...input, imageUrl: null, createdAt: new Date() });
    await writeFileStore(items);
    return id;
  },
};
