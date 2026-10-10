import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const IMAGE_BUCKET = 'listing-images';

let client: SupabaseClient | null = null;

// عميل للسيرفر فقط: يستخدم مفتاح service_role، ولا يجوز وصوله للمتصفح أبداً
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY غير مضبوطين في متغيرات البيئة.');
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// رابط الصورة العام داخل الحاوية
export function publicImageUrl(path: string): string {
  return supabaseAdmin().storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// يستخرج مسار الملف من رابطنا العام، أو null إن لم يكن من حاويتنا
export function imagePathFromUrl(url: string): string | null {
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  const prefix = `${base.replace(/\/$/, '')}/storage/v1/object/public/${IMAGE_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  const p = url.slice(prefix.length);
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(p) ? p : null;
}
