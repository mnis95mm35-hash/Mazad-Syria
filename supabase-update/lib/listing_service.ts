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
};

// تحويل صف قاعدة البيانات إلى نوع Listing، مع انتهاء التمييز تلقائياً
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
  };
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

// نهرّب الأحرف الخاصة بصيغة PostgREST حتى لا يعبث نص البحث بالاستعلام
function escapeSearch(q: string) {
  return q.replace(/[%_,()*\\]/g, ' ').trim();
}

async function getListings(filters: ListingFilters = {}): Promise<Listing[]> {
  let query = supabaseAdmin().from('listings').select('*');
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
  const q = filters.q ? escapeSearch(filters.q) : '';
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(`تعذّر جلب الإعلانات: ${error.message}`);
  return sortListings((data as Row[]).map(fromRow), filters.sort);
}

async function getListing(id: number): Promise<Listing | null> {
  const { data, error } = await supabaseAdmin().from('listings').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`تعذّر جلب الإعلان: ${error.message}`);
  return data ? fromRow(data as Row) : null;
}

// للوحة الإدارة: كل الإعلانات من الأحدث
async function getAllListings(): Promise<Listing[]> {
  const { data, error } = await supabaseAdmin()
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`تعذّر جلب الإعلانات: ${error.message}`);
  return (data as Row[]).map(fromRow);
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

// يعيد قائمة صور الإعلان المحذوف ليحذفها المستدعي من التخزين
async function deleteListing(id: number): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from('listings').delete().eq('id', id).select('images');
  if (error) throw new Error(`تعذّر حذف الإعلان: ${error.message}`);
  return (data?.[0]?.images as string[] | undefined) ?? [];
}

export const listingService = {
  getListings,
  getListing,
  getAllListings,
  createListing,
  setFeatured,
  deleteListing,
};
