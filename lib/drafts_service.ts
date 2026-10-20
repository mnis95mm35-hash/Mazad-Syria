import { supabaseAdmin } from '@/lib/supabase';
import { listingService } from '@/lib/listing_service';
import { parseListingFields } from '@/lib/listing_form';
import { normCategory, normCity, normCurrency } from '@/lib/bulk_import';
import { parseAdText, splitPosts } from '@/lib/ad_text';

export type DraftStatus = 'draft' | 'invited' | 'claimed' | 'published' | 'rejected';

export type Draft = {
  id: number;
  sourceId: number | null;
  rawText: string;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  category: string | null;
  subcategory: string | null;
  city: string | null;
  area: string | null;
  sellerName: string | null;
  sellerPhone: string | null;
  extras: Record<string, number | null>;
  images: string[];
  status: DraftStatus;
  consentAt: Date | null;
  consentNote: string | null;
  listingId: number | null;
  createdAt: Date;
  expiresAt: Date;
};

const MAX_BATCH = 50;

// مفتاح التكرار: الهاتف + عنوان منظّف (حروف وأرقام فقط)
export function dedupeKey(phone: string | null, title: string): string {
  const p = (phone ?? '').replace(/\D/g, '').replace(/^(00)?963/, '0');
  const t = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 60);
  return `${p}|${t}`;
}

type Row = Record<string, unknown>;
function toDraft(r: Row): Draft {
  return {
    id: r.id as number,
    sourceId: (r.source_id as number | null) ?? null,
    rawText: r.raw_text as string,
    title: r.title as string,
    description: (r.description as string) ?? '',
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    currency: (r.currency as string) ?? 'USD',
    category: (r.category as string | null) ?? null,
    subcategory: (r.subcategory as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    area: (r.area as string | null) ?? null,
    sellerName: (r.seller_name as string | null) ?? null,
    sellerPhone: (r.seller_phone as string | null) ?? null,
    extras: (r.extras as Record<string, number | null>) ?? {},
    images: (r.images as string[]) ?? [],
    status: r.status as DraftStatus,
    consentAt: r.consent_at ? new Date(r.consent_at as string) : null,
    consentNote: (r.consent_note as string | null) ?? null,
    listingId: (r.listing_id as number | null) ?? null,
    createdAt: new Date(r.created_at as string),
    expiresAt: new Date(r.expires_at as string),
  };
}

export type AddResult = { added: number; duplicates: number; skipped: number };

// نص فيه منشور أو أكثر → مسودات. المحلل الحالي (ad_text) يملأ الحقول، والإدارة تراجعها.
async function addFromText(text: string, opts: { sourceId?: number | null; defaultPhone?: string; defaultName?: string }): Promise<AddResult> {
  const posts = splitPosts(text).slice(0, MAX_BATCH);
  const res: AddResult = { added: 0, duplicates: 0, skipped: 0 };
  const db = supabaseAdmin();
  for (const raw of posts) {
    const p = parseAdText(raw);
    const phone = p.phone ?? (opts.defaultPhone || null);
    if (!p.title.trim()) {
      res.skipped++;
      continue;
    }
    const key = dedupeKey(phone, p.title);
    // مكرر مع إعلان منشور بنفس الهاتف والعنوان؟
    if (phone) {
      const { data: live } = await db.from('listings').select('id').eq('seller_phone', phone).eq('title', p.title).limit(1);
      if (live && live.length > 0) {
        res.duplicates++;
        continue;
      }
    }
    const { error } = await db.from('ad_drafts').insert({
      source_id: opts.sourceId ?? null,
      raw_text: raw.slice(0, 5000),
      title: p.title.slice(0, 200),
      description: p.description.slice(0, 5000),
      price: p.price,
      currency: p.currency ?? 'USD',
      category: p.category,
      subcategory: p.subcategory,
      city: p.city,
      area: p.area,
      seller_name: p.sellerName ?? (opts.defaultName || null),
      seller_phone: phone,
      extras: { rooms: p.rooms, sizeM2: p.sizeM2, carYear: p.carYear, carKm: p.carKm },
      dedupe_key: key,
    });
    if (error) {
      if (error.code === '23505') res.duplicates++;
      else throw new Error(`تعذّر حفظ المسودة: ${error.message}`);
    } else res.added++;
  }
  return res;
}

async function list(status?: DraftStatus | 'open'): Promise<Draft[]> {
  let q = supabaseAdmin().from('ad_drafts').select('*').order('created_at', { ascending: false }).limit(200);
  if (status === 'open') q = q.in('status', ['draft', 'invited', 'claimed']);
  else if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toDraft);
}

async function get(id: number): Promise<Draft | null> {
  const { data, error } = await supabaseAdmin().from('ad_drafts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toDraft(data) : null;
}

export type DraftEdit = {
  title: string;
  price: string;
  currency: string;
  category: string;
  city: string;
  sellerName: string;
  sellerPhone: string;
};

async function update(id: number, e: DraftEdit): Promise<void> {
  const priceNum = e.price.trim() === '' ? null : Number(e.price.replace(/,/g, ''));
  const { error } = await supabaseAdmin()
    .from('ad_drafts')
    .update({
      title: e.title.trim().slice(0, 200),
      price: priceNum !== null && Number.isFinite(priceNum) ? priceNum : null,
      currency: normCurrency(e.currency),
      category: normCategory(e.category) || null,
      city: normCity(e.city) || null,
      seller_name: e.sellerName.trim() || null,
      seller_phone: e.sellerPhone.trim() || null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

async function setStatus(id: number, status: DraftStatus): Promise<void> {
  const { error } = await supabaseAdmin().from('ad_drafts').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function remove(id: number): Promise<void> {
  const { error } = await supabaseAdmin().from('ad_drafts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ينشر المسودة كإعلان فعلي. شرط ذلك موافقة موثّقة: لا نشر بدونها.
async function publish(id: number, consentNote: string): Promise<{ error: string } | { listingId: number }> {
  const d = await get(id);
  if (!d) return { error: 'المسودة غير موجودة.' };
  if (d.status === 'published') return { error: 'نُشرت سابقاً.' };
  if (!consentNote.trim()) return { error: 'اكتب كيف وصلتك موافقة صاحب الإعلان (مثلاً: واتساب بتاريخ كذا).' };

  const fd = new FormData();
  const set = (k: string, v: unknown) => fd.set(k, v === null || v === undefined ? '' : String(v));
  set('title', d.title);
  set('description', d.description);
  set('price', d.price);
  set('currency', d.currency);
  set('category', d.category);
  set('subcategory', d.subcategory);
  set('city', d.city);
  set('area', d.area);
  set('sellerName', d.sellerName);
  set('sellerPhone', d.sellerPhone);
  for (const k of ['rooms', 'sizeM2', 'carYear', 'carKm']) set(k, d.extras[k]);

  const parsed = parseListingFields(fd);
  if ('error' in parsed) return { error: parsed.error };
  if (!(parsed.fields.price > 0)) return { error: 'السعر مطلوب (أكبر من صفر).' };

  const listingId = await listingService.createListing({ ...parsed.fields, images: d.images, userId: null, status: 'active' });
  const { error } = await supabaseAdmin()
    .from('ad_drafts')
    .update({ status: 'published', listing_id: listingId, consent_at: new Date().toISOString(), consent_note: consentNote.trim().slice(0, 300) })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { listingId };
}

// المسودات المنتهية (لم يُطالَب بها) تُحذف حمايةً لبيانات أصحابها
async function purgeExpired(): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from('ad_drafts')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .in('status', ['draft', 'invited'])
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export const drafts = { addFromText, list, get, update, setStatus, remove, publish, purgeExpired };
