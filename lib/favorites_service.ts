import { supabaseAdmin } from '@/lib/supabase';

// أقصى عدد إعلانات في مفضلة المستخدم الواحد (حماية من الإساءة)
export const MAX_FAVORITES = 200;

// أرقام إعلانات المفضلة، الأحدث إضافة أولاً
async function listIds(userId: string): Promise<number[]> {
  const { data, error } = await supabaseAdmin()
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_FAVORITES);
  if (error) throw new Error(`تعذّر جلب المفضلة: ${error.message}`);
  return (data ?? []).map((r: { listing_id: number }) => Number(r.listing_id));
}

// يبدّل حالة الإعلان في المفضلة ويعيد الحالة الجديدة (true = مضاف). null إن امتلأت المفضلة
async function toggle(userId: string, listingId: number): Promise<boolean | null> {
  const sb = supabaseAdmin();
  const { data: existing, error: e1 } = await sb
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (e1) throw new Error(e1.message);
  if (existing) {
    const { error } = await sb.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) throw new Error(error.message);
    return false;
  }
  const { count, error: e2 } = await sb.from('favorites').select('listing_id', { count: 'exact', head: true }).eq('user_id', userId);
  if (e2) throw new Error(e2.message);
  if ((count ?? 0) >= MAX_FAVORITES) return null;
  const { error } = await sb.from('favorites').upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });
  if (error) throw new Error(error.message);
  return true;
}

export const favorites = { listIds, toggle };
