import { promises as fs } from 'fs';
import path from 'path';
import { SAMPLE_LISTINGS, type Listing } from '@/lib/sample_data';

export type SortKey = 'newest' | 'price_asc' | 'price_desc';

export type ListingFilters = {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
};

export type NewListingInput = {
  title: string;
  description: string | null;
  price: number;
  category: string;
  city: string;
  images: string[];
  sellerName: string;
  sellerPhone: string | null;
};

const FILE_PATH = path.join(process.cwd(), 'data', 'listings.json');
const DAY_MS = 24 * 60 * 60 * 1000;

// نوحّد شكل الإعلان: الصور، وانتهاء التمييز تلقائياً
function normalize(l: Listing): Listing {
  const images = l.images && l.images.length > 0 ? l.images : l.imageUrl ? [l.imageUrl] : [];
  const until = l.featuredUntil ? new Date(l.featuredUntil as unknown as string | Date) : null;
  const isFeatured = Boolean(l.isFeatured) && (!until || until.getTime() > Date.now());
  return { ...l, images, imageUrl: images[0] ?? null, isFeatured, featuredUntil: until };
}

// صفوف قاعدة البيانات تخزّن الصور كنص JSON
function fromDbRow(row: unknown): Listing {
  const r = row as Omit<Listing, 'images'> & { images?: string | null };
  let images: string[] = [];
  try {
    const parsed = JSON.parse(r.images ?? '[]');
    if (Array.isArray(parsed)) images = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    images = [];
  }
  return normalize({ ...r, images });
}

function applyFilters(items: Listing[], f: ListingFilters) {
  const q = f.q?.trim().toLowerCase();
  return items.filter(
    (l) =>
      (!q || l.title.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q)) &&
      (!f.category || l.category === f.category) &&
      (!f.city || l.city === f.city) &&
      (f.minPrice === undefined || l.price >= f.minPrice) &&
      (f.maxPrice === undefined || l.price <= f.maxPrice),
  );
}

function byDateDesc(a: Listing, b: Listing) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function sortListings(items: Listing[], sort: SortKey = 'newest') {
  if (sort === 'price_asc') return [...items].sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') return [...items].sort((a, b) => b.price - a.price);
  // الافتراضي: المميّز أولاً، ثم الأحدث
  return [...items].sort((a, b) => {
    const fa = a.isFeatured ? 1 : 0;
    const fb = b.isFeatured ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return byDateDesc(a, b);
  });
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
    return rows.map((r) => normalize({ ...r, createdAt: new Date(r.createdAt) }));
  } catch {
    return SAMPLE_LISTINGS.map(normalize);
  }
}

async function writeFileStore(items: Listing[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
}

async function loadAll(): Promise<Listing[]> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.listing.findMany({ orderBy: { createdAt: 'desc' } });
    if (rows.length > 0) return rows.map(fromDbRow);
  } catch {
    // قاعدة البيانات غير جاهزة: ننتقل للملف المحلي
  }
  return readFileStore();
}

async function getListing(id: number): Promise<Listing | null> {
  try {
    const prisma = await getPrisma();
    const row = await prisma.listing.findUnique({ where: { id } });
    if (row) return fromDbRow(row);
  } catch {
    // ننتقل للملف المحلي
  }
  const items = await readFileStore();
  return items.find((l) => l.id === id) ?? null;
}

async function getListings(filters: ListingFilters = {}): Promise<Listing[]> {
  return sortListings(applyFilters(await loadAll(), filters), filters.sort);
}

// للوحة الإدارة: كل الإعلانات من الأحدث
async function getAllListings(): Promise<Listing[]> {
  return [...(await loadAll())].sort(byDateDesc);
}

async function createListing(input: NewListingInput): Promise<number> {
  const cover = input.images[0] ?? null;
  try {
    const prisma = await getPrisma();
    const row = await prisma.listing.create({
      data: { ...input, imageUrl: cover, images: JSON.stringify(input.images) },
    });
    return row.id;
  } catch {
    // قاعدة البيانات غير جاهزة: نحفظ في الملف المحلي
  }
  const items = await readFileStore();
  const id = items.reduce((m, l) => Math.max(m, l.id), 0) + 1;
  items.push({ id, ...input, imageUrl: cover, isFeatured: false, featuredUntil: null, createdAt: new Date() });
  await writeFileStore(items);
  return id;
}

// days = null يعني إلغاء التمييز
async function setFeatured(id: number, days: number | null): Promise<void> {
  const until = days === null ? null : new Date(Date.now() + days * DAY_MS);
  try {
    const prisma = await getPrisma();
    await prisma.listing.update({
      where: { id },
      data: { isFeatured: days !== null, featuredUntil: until },
    });
    return;
  } catch {
    // السجل غير موجود في القاعدة أو القاعدة غير جاهزة: نستخدم الملف المحلي
  }
  const items = await readFileStore();
  const target = items.find((l) => l.id === id);
  if (!target) return;
  target.isFeatured = days !== null;
  target.featuredUntil = until;
  await writeFileStore(items);
}

// يعيد قائمة صور الإعلان المحذوف ليحذفها المستدعي من القرص
async function deleteListing(id: number): Promise<string[]> {
  const existing = await getListing(id);
  const images = existing?.images ?? [];
  try {
    const prisma = await getPrisma();
    await prisma.listing.delete({ where: { id } });
    return images;
  } catch {
    // ننتقل للملف المحلي
  }
  const items = await readFileStore();
  await writeFileStore(items.filter((l) => l.id !== id));
  return images;
}

export const listingService = {
  getListings,
  getListing,
  getAllListings,
  createListing,
  setFeatured,
  deleteListing,
};
