import { supabaseAdmin } from '@/lib/supabase';
import { listingService } from '@/lib/listing_service';

export type FeatureRequest = {
  id: number;
  listingId: number;
  listingTitle?: string;
  userId: string | null;
  days: number;
  amount: number;
  status: 'pending' | 'activated' | 'rejected';
  createdAt: Date;
};

type Row = {
  id: number;
  listing_id: number;
  user_id: string | null;
  days: number;
  amount_usd: number | string;
  status: FeatureRequest['status'];
  created_at: string;
  listings?: { title: string } | null;
};

const fromRow = (r: Row): FeatureRequest => ({
  id: r.id,
  listingId: r.listing_id,
  listingTitle: r.listings?.title,
  userId: r.user_id,
  days: r.days,
  amount: Number(r.amount_usd),
  status: r.status,
  createdAt: new Date(r.created_at),
});

async function hasPending(listingId: number): Promise<boolean> {
  const { count, error } = await supabaseAdmin()
    .from('feature_requests')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function create(input: { listingId: number; userId: string; days: number; amount: number }): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from('feature_requests')
    .insert({
      listing_id: input.listingId,
      user_id: input.userId,
      days: input.days,
      amount_usd: input.amount,
    })
    .select('id')
    .single();
  if (error) throw new Error(`تعذّر إنشاء الطلب: ${error.message}`);
  return data.id as number;
}

async function listByUser(userId: string): Promise<FeatureRequest[]> {
  const { data, error } = await supabaseAdmin()
    .from('feature_requests')
    .select('*, listings(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(fromRow);
}

async function listRecent(): Promise<FeatureRequest[]> {
  const { data, error } = await supabaseAdmin()
    .from('feature_requests')
    .select('*, listings(title)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(fromRow);
}

// تأكيد الدفع: يفعّل التمييز ويغلق الطلب
async function activate(id: number): Promise<void> {
  const { data, error } = await supabaseAdmin()
    .from('feature_requests')
    .select('listing_id, days, status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== 'pending') return;
  await listingService.setFeatured(data.listing_id as number, data.days as number);
  const { error: e2 } = await supabaseAdmin()
    .from('feature_requests')
    .update({ status: 'activated', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (e2) throw new Error(e2.message);
}

async function reject(id: number): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('feature_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
}

export const orders = { hasPending, create, listByUser, listRecent, activate, reject };
