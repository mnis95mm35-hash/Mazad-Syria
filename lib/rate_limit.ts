import { headers } from 'next/headers';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export type Rule = { max: number; windowMs: number };

// مفتاح مجزّأ من عنوان الزائر، فلا نخزّن عنوان IP نفسه
async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
  const salt = process.env.ADMIN_SESSION_SECRET ?? 'mazad';
  return `${scope}:${createHash('sha256').update(`${ip}|${salt}`).digest('hex').slice(0, 32)}`;
}

// هل تجاوز الزائر أحد الحدود؟ عند تعذّر الوصول لقاعدة البيانات لا نحجب أحداً
export async function isLimited(scope: string, rules: Rule[]): Promise<boolean> {
  try {
    const key = await clientKey(scope);
    for (const r of rules) {
      const since = new Date(Date.now() - r.windowMs).toISOString();
      const { count, error } = await supabaseAdmin()
        .from('rate_events')
        .select('id', { count: 'exact', head: true })
        .eq('key', key)
        .gte('created_at', since);
      if (error) throw error;
      if ((count ?? 0) >= r.max) return true;
    }
    return false;
  } catch (e) {
    console.error('rate_limit check failed', e);
    return false;
  }
}

export async function recordEvent(scope: string): Promise<void> {
  try {
    const db = supabaseAdmin();
    await db.from('rate_events').insert({ key: await clientKey(scope) });
    // تنظيف أحياناً للأحداث الأقدم من يومين
    if (Math.random() < 0.02) {
      await db.from('rate_events').delete().lt('created_at', new Date(Date.now() - 2 * 86400000).toISOString());
    }
  } catch (e) {
    console.error('rate_limit record failed', e);
  }
}
