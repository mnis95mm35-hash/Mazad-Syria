import { supabaseAdmin } from '@/lib/supabase';
import { notifyAdminNow } from '@/lib/notify';

export type JobRun = { id: number; job: string; ok: boolean; detail: string | null; ms: number | null; createdAt: Date };

async function record(job: string, ok: boolean, detail: string, ms: number) {
  try {
    const { error } = await supabaseAdmin().from('job_runs').insert({ job, ok, detail: detail.slice(0, 500), ms });
    if (error) console.error('job_runs insert failed', error.message);
  } catch (e) {
    console.error('job_runs insert failed', e);
  }
}

// يشغّل مهمة ويسجّل نتيجتها. عند الفشل يرسل تنبيهاً للإدارة ثم يعيد رمي الخطأ.
export async function runLogged<T>(job: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const res = await fn();
    await record(job, true, JSON.stringify(res ?? null), Date.now() - t0);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await record(job, false, msg, Date.now() - t0);
    await notifyAdminNow(`❌ فشلت المهمة ${job}: ${msg}`.slice(0, 500)).catch(() => false);
    throw e;
  }
}

export async function recentJobRuns(limit = 20): Promise<JobRun[]> {
  const { data, error } = await supabaseAdmin().from('job_runs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as number,
    job: r.job as string,
    ok: r.ok as boolean,
    detail: (r.detail as string | null) ?? null,
    ms: (r.ms as number | null) ?? null,
    createdAt: new Date(r.created_at as string),
  }));
}
