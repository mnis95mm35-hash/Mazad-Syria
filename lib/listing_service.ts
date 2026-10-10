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

// التخزين الحالي: ملف JSON محلي. سيُستبدل بقاعدة بيانات خارجية (Supabase)
// دون تغيير بقية الكود، لأن كل الصفحات تتعامل مع listingService فقط.
const FILE_PATH = path.join(process.cwd(), 'data', 'listings.json');
const DAY_MS = 24 * 60 * 60 * 1000;

// نوحّد شكل الإعلان: الصور، وانتهاء التمييز تلقائياً
function normalize(l: Listing): Listing {
  const images = l.images && l.images.length > 0 ? l.images : l.imageUrl ? [l.imageUrl] : [];
  const until = l.featuredUntil ? new Date(l.featuredUntil as unknown as string | Date) : null;
  const isFeatured = Boolean(l.isFeatured) && (!until || until.getTime() > Date.now());
  return { ...l, images, imageUrl: images[0] ?? null, isFeatured, featuredUntil: until };
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

async function readStore(): Promise<Listing[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const rows = JSON.parse(raw) as Listing[];
    return rows.map((r) => normalize({ ...r, createdAt: new Date(r.createdAt) }));
  } catch {
    // لا يوجد ملف بعد: نبدأ بالإعلانات التجريبية
    return SAMPLE_LISTINGS.map(normalize);
  }
}

async function writeStore(items: Listing[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
}

async function getListings(filters: ListingFilters = {}): Promise<Listing[]> {
  return sortListings(applyFilters(await readStore(), filters), filters.sort);
}

async function getListing(id: number): Promise<Listing | null> {
  const items = await readStore();
  return items.find((l) => l.id === id) ?? null;
}

// للوحة الإدارة: كل الإعلانات من الأحدث
async function getAllListings(): Promise<Listing[]> {
  return [...(await readStore())].sort(byDateDesc);
}

async function createListing(input: NewListingInput): Promise<number> {
  const items = await readStore();
  const id = items.reduce((m, l) => Math.max(m, l.id), 0) + 1;
  items.push({
    id,
    ...input,
    imageUrl: input.images[0] ?? null,
    isFeatured: false,
    featuredUntil: null,
    createdAt: new Date(),
  });
  await writeStore(items);
  return id;
}

// days = null يعني إلغاء التمييز
async function setFeatured(id: number, days: number | null): Promise<void> {
  const items = await readStore();
  const target = items.find((l) => l.id === id);
  if (!target) return;
  target.isFeatured = days !== null;
  target.featuredUntil = days === null ? null : new Date(Date.now() + days * DAY_MS);
  await writeStore(items);
}

// يعيد قائمة صور الإعلان المحذوف ليحذفها المستدعي من القرص
async function deleteListing(id: number): Promise<string[]> {
  const items = await readStore();
  const existing = items.find((l) => l.id === id);
  if (!existing) return [];
  await writeStore(items.filter((l) => l.id !== id));
  return existing.images ?? [];
}

export const listingService = {
  getListings,
  getListing,
  getAllListings,
  createListing,
  setFeatured,
  deleteListing,
};
