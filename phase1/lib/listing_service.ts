import { supabaseAdmin } from '@/lib/supabase';
import type { Listing } from '@/lib/sample_data';

export type SortKey = 'newest' | 'price_asc' | 'price_desc';

export type ListingFilters = {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  // only = المميّز حالياً فقط، exclude = غير المميّز فقط
  featured?: 'only' | 'exclude';
};

export type ListingsPage = {
  items: Listing[];
  total: number;
  page: number;
  pageCount: number;
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

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_PAGE_SIZE = 24;
export const LISTING_LIFETIME_DAYS = 60;

type Row = {
  id: number;
  title: string;
  description: string | null;
  price: number | string;
  category: string;
  city: string;
  images: string[] | null;
  seller_name: string;
  seller_phone: string | null;
  is_featured: boolean;
  featured_until: string | null;
  created_at: string;
  status: 'active' | 'hidden';
  expires_at: string | null;
};

function fromRow(r: Row): Listing {
  const images = r.images ?? [];
  const until = r.featured_until ? new Date(r.featured_until) : null;
  const isFeatured = r.is_featured && (!until || until.getTime() > Date.now());
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    price: Number(r.price),
    category: r.category,
    city: r.city,
    images,
    imageUrl: images[0] ?? null,
    sellerName: r.seller_name,
    sellerPhone: r.seller_phone,
    isFeatured,
    featuredUntil: until,
    createdAt: new Date(r.created_at),
    status: r.status,
    expiresAt: r.expires_at ? new Date(r.expires_at) : null,
  };
}

// نهرّب الأحرف الخاصة بصيغة PostgREST حتى لا يعبث نص البحث بالاستعلام
function escapeSearch(q: string) {
  return q.replace(/[%_,()*\\]/g, ' ').trim();
}

// نُسقط علم التمييز من الإعلانات التي انتهت مدتها، مرة كل 5 دقائق كحد أقصى
let lastFeaturedSweep = 0;
async function sweepExpiredFeatured() {
  if (Date.now() - lastFeaturedSweep < 5 * 60 * 1000) return;
  lastFeaturedSweep = Date.now();
  await supabaseAdmin()
    .from('listings')
    .update({ is_featured: false })
    .eq('is_featured', true)
    .lt('featured_until', new Date().toISOString());
}

// الإعلانات الظاهرة للعامة: فعّالة وغير منتهية، مع ترقيم صفحات
async function searchListings(filters: ListingFilters = {}): Promise<ListingsPage> {
  await sweepExpiredFeatured();
  const nowIso = new Date().toISOString();
  const pageSize = Math.min(Math.max(filters.pageSize ?? DEFAULT_PAGE_SIZE, 1), 60);
  const page = Math.max(Math.floor(filters.page ?? 1), 1);
  const from = (page - 1) * pageSize;

  let query = supabaseAdmin()
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .gt('expires_at', nowIso);

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
  const q = filters.q ? escapeSearch(filters.q) : '';
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (filters.featured === 'only') {
    query = query.eq('is_featured', true).or(`featured_until.is.null,featured_until.gt.${nowIso}`);
  } else if (filters.featured === 'exclude') {
    query = query.or(`is_featured.eq.false,featured_until.lte.${nowIso}`);
  }

  if (filters.sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (filters.sort === 'price_desc') query = query.order('price', { ascending: false });
  else query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(`تعذّر جلب الإعلانات: ${error.message}`);
  const total = count ?? 0;
  return {
    items: (data as Row[]).map(fromRow),
    total,
    page,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}

// إعلان واحد. للعامة: فعّال وغير منتهٍ فقط
async function getListing(id: number, opts: { includeInactive?: boolean } = {}): Promise<Listing | null> {
  let query = supabaseAdmin().from('listings').select('*').eq('id', id);
  if (!opts.includeInactive) query = query.eq('status', 'active').gt('expires_at', new Date().toISOString());
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`تعذّر جلب الإعلان: ${error.message}`);
  return data ? fromRow(data as Row) : null;
}

// للوحة الإدارة: كل الإعلانات بما فيها المخفية والمنتهية
async function getAllListings(): Promise<Listing[]> {
  const { data, error } = await supabaseAdmin()
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`تعذّر جلب الإعلانات: ${error.message}`);
  return (data as Row[]).map(fromRow);
}

// لخريطة الموقع
async function getSitemapEntries(): Promise<{ id: number; createdAt: Date }[]> {
  const { data, error } = await supabaseAdmin()
    .from('listings')
    .select('id, created_at')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data as { id: number; created_at: string }[]).map((r) => ({ id: r.id, createdAt: new Date(r.created_at) }));
}

async function createListing(input: NewListingInput): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from('listings')
    .insert({
      title: input.title,
      description: input.description,
      price: input.price,
      category: input.category,
      city: input.city,
      images: input.images,
      seller_name: input.sellerName,
      seller_phone: input.sellerPhone,
      expires_at: new Date(Date.now() + LISTING_LIFETIME_DAYS * DAY_MS).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new Error(`تعذّر حفظ الإعلان: ${error.message}`);
  return data.id as number;
}

// days = null يعني إلغاء التمييز
async function setFeatured(id: number, days: number | null): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('listings')
    .update({
      is_featured: days !== null,
      featured_until: days === null ? null : new Date(Date.now() + days * DAY_MS).toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(`تعذّر تحديث التمييز: ${error.message}`);
}

async function setStatus(id: number, status: 'active' | 'hidden'): Promise<void> {
  const { error } = await supabaseAdmin().from('listings').update({ status }).eq('id', id);
  if (error) throw new Error(`تعذّر تحديث الحالة: ${error.message}`);
}

// تجديد: يمدّد الصلاحية من الآن ويعيد الإعلان فعّالاً
async function renew(id: number, days = LISTING_LIFETIME_DAYS): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('listings')
    .update({ status: 'active', expires_at: new Date(Date.now() + days * DAY_MS).toISOString() })
    .eq('id', id);
  if (error) throw new Error(`تعذّر تجديد الإعلان: ${error.message}`);
}

// يعيد قائمة صور الإعلان المحذوف ليحذفها المستدعي من التخزين
async function deleteListing(id: number): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from('listings').delete().eq('id', id).select('images');
  if (error) throw new Error(`تعذّر حذف الإعلان: ${error.message}`);
  return (data?.[0]?.images as string[] | undefined) ?? [];
}

export const listingService = {
  searchListings,
  getListing,
  getAllListings,
  getSitemapEntries,
  createListing,
  setFeatured,
  setStatus,
  renew,
  deleteListing,
};
