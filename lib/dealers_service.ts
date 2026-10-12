import { supabaseAdmin } from '@/lib/supabase';
import { DEALER_PLANS, FREE_LISTING_LIMIT, dealerPrice, type DealerPlanId } from '@/lib/site_config';

export type Dealer = {
  id: number;
  userId: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
  plan: DealerPlanId;
  planUntil: Date | null;
  status: 'pending' | 'active' | 'suspended';
  verified: boolean;
  createdAt: Date;
};

export type DealerInput = {
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
};

export type PlanRequest = {
  id: number;
  dealerId: number;
  dealerName?: string;
  userId: string | null;
  plan: DealerPlanId;
  months: number;
  amount: number;
  status: 'pending' | 'activated' | 'rejected';
  createdAt: Date;
};

type Row = {
  id: number;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  logo_url: string | null;
  plan: DealerPlanId;
  plan_until: string | null;
  status: Dealer['status'];
  verified: boolean;
  created_at: string;
};

type ReqRow = {
  id: number;
  dealer_id: number;
  user_id: string | null;
  plan: DealerPlanId;
  months: number;
  amount_usd: number | string;
  status: PlanRequest['status'];
  created_at: string;
  dealers?: { name: string } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const fromRow = (r: Row): Dealer => ({
  id: r.id,
  userId: r.user_id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  phone: r.phone,
  city: r.city,
  address: r.address,
  logoUrl: r.logo_url,
  plan: r.plan,
  planUntil: r.plan_until ? new Date(r.plan_until) : null,
  status: r.status,
  verified: r.verified,
  createdAt: new Date(r.created_at),
});

const reqFromRow = (r: ReqRow): PlanRequest => ({
  id: r.id,
  dealerId: r.dealer_id,
  dealerName: r.dealers?.name,
  userId: r.user_id,
  plan: r.plan,
  months: r.months,
  amount: Number(r.amount_usd),
  status: r.status,
  createdAt: new Date(r.created_at),
});

// التاجر "حيّ" إن كان مفعّلاً واشتراكه ساري: وحده تظهر صفحته للعامة ويحصل على حد الباقة
export function isLive(d: Dealer | null | undefined): boolean {
  return Boolean(d && d.status === 'active' && d.planUntil && d.planUntil.getTime() > Date.now());
}

export function liveOrNull(d: Dealer | null | undefined): Dealer | null {
  return d && isLive(d) ? d : null;
}

// الحد الأقصى للإعلانات الفعّالة لهذا المستخدم
export function listingLimit(d: Dealer | null | undefined): number {
  const live = liveOrNull(d);
  return live ? DEALER_PLANS[live.plan].limit : FREE_LISTING_LIMIT;
}

async function getByUser(userId: string): Promise<Dealer | null> {
  const { data, error } = await supabaseAdmin().from('dealers').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`تعذّر جلب حساب التاجر: ${error.message}`);
  return data ? fromRow(data as Row) : null;
}

async function getBySlug(slug: string): Promise<Dealer | null> {
  const { data, error } = await supabaseAdmin().from('dealers').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(`تعذّر جلب التاجر: ${error.message}`);
  return data ? fromRow(data as Row) : null;
}

async function slugTaken(slug: string, exceptId?: number): Promise<boolean> {
  let q = supabaseAdmin().from('dealers').select('id', { count: 'exact', head: true }).eq('slug', slug);
  if (exceptId) q = q.neq('id', exceptId);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function create(userId: string, input: DealerInput, plan: DealerPlanId): Promise<Dealer> {
  const { data, error } = await supabaseAdmin()
    .from('dealers')
    .insert({
      user_id: userId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      phone: input.phone,
      city: input.city,
      address: input.address,
      logo_url: input.logoUrl,
      plan,
    })
    .select('*')
    .single();
  if (error) throw new Error(`تعذّر إنشاء حساب التاجر: ${error.message}`);
  return fromRow(data as Row);
}

async function update(id: number, input: DealerInput): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('dealers')
    .update({
      slug: input.slug,
      name: input.name,
      description: input.description,
      phone: input.phone,
      city: input.city,
      address: input.address,
      logo_url: input.logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(`تعذّر حفظ بيانات التاجر: ${error.message}`);
}

// التجار الذين يحق لهم صفحة عامة الآن
async function listLive(): Promise<Dealer[]> {
  const { data, error } = await supabaseAdmin()
    .from('dealers')
    .select('*')
    .eq('status', 'active')
    .gt('plan_until', new Date().toISOString())
    .order('verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data as Row[]).map(fromRow);
}

async function listAll(): Promise<Dealer[]> {
  const { data, error } = await supabaseAdmin()
    .from('dealers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data as Row[]).map(fromRow);
}

async function setVerified(id: number, verified: boolean): Promise<void> {
  const { error } = await supabaseAdmin().from('dealers').update({ verified }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function setStatus(id: number, status: 'active' | 'suspended'): Promise<void> {
  const { error } = await supabaseAdmin().from('dealers').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ===== طلبات الاشتراك =====

async function hasPendingRequest(dealerId: number): Promise<boolean> {
  const { count, error } = await supabaseAdmin()
    .from('plan_requests')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function createRequest(input: { dealerId: number; userId: string; plan: DealerPlanId; months: number }): Promise<number> {
  const amount = dealerPrice(input.plan, input.months);
  if (amount === null) throw new Error('مدة اشتراك غير صالحة.');
  const { data, error } = await supabaseAdmin()
    .from('plan_requests')
    .insert({
      dealer_id: input.dealerId,
      user_id: input.userId,
      plan: input.plan,
      months: input.months,
      amount_usd: amount,
    })
    .select('id')
    .single();
  if (error) throw new Error(`تعذّر إنشاء الطلب: ${error.message}`);
  return data.id as number;
}

async function listRequestsByDealer(dealerId: number): Promise<PlanRequest[]> {
  const { data, error } = await supabaseAdmin()
    .from('plan_requests')
    .select('*')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as unknown as ReqRow[]).map(reqFromRow);
}

async function listRecentRequests(): Promise<PlanRequest[]> {
  const { data, error } = await supabaseAdmin()
    .from('plan_requests')
    .select('*, dealers(name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data as unknown as ReqRow[]).map(reqFromRow);
}

// تأكيد الدفع: يفعّل الاشتراك ويمدّده من تاريخ انتهاء الاشتراك الحالي إن كان ساري المفعول
async function activateRequest(id: number): Promise<void> {
  const db = supabaseAdmin();
  const { data: req, error } = await db
    .from('plan_requests')
    .select('dealer_id, plan, months, status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!req || req.status !== 'pending') return;

  const { data: dealerRow, error: e2 } = await db
    .from('dealers')
    .select('plan, plan_until, status')
    .eq('id', req.dealer_id)
    .maybeSingle();
  if (e2) throw new Error(e2.message);
  if (!dealerRow) return;

  const currentEnd = dealerRow.plan_until ? new Date(dealerRow.plan_until as string).getTime() : 0;
  // نمدّد من نهاية الاشتراك الحالي فقط إن كان سارياً وبالباقة نفسها، وإلا نبدأ من الآن
  const start = currentEnd > Date.now() && dealerRow.plan === req.plan ? currentEnd : Date.now();
  const until = new Date(start + (req.months as number) * 30 * DAY_MS).toISOString();

  const { error: e3 } = await db
    .from('dealers')
    .update({
      plan: req.plan,
      plan_until: until,
      // لا نعيد تفعيل تاجر أوقفته الإدارة
      status: dealerRow.status === 'suspended' ? 'suspended' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.dealer_id);
  if (e3) throw new Error(e3.message);

  const { error: e4 } = await db
    .from('plan_requests')
    .update({ status: 'activated', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (e4) throw new Error(e4.message);
}

async function rejectRequest(id: number): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('plan_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
}

export const dealers = {
  getByUser,
  getBySlug,
  slugTaken,
  create,
  update,
  listLive,
  listAll,
  setVerified,
  setStatus,
  hasPendingRequest,
  createRequest,
  listRequestsByDealer,
  listRecentRequests,
  activateRequest,
  rejectRequest,
};
