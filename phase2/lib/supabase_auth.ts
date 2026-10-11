import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

export type CurrentUser = { id: string; email: string };

export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

// عميل Supabase لتسجيل دخول المستخدمين: يحفظ الجلسة في كوكيز httpOnly
// يستخدم المفتاح العام (publishable) وليس مفتاح service_role
export async function supabaseAuth() {
  const store = await cookies();
  return createServerClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_PUBLISHABLE_KEY as string, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // يُستدعى من مكوّن سيرفر لا يستطيع كتابة الكوكيز: يحدّثها proxy.ts
        }
      },
    },
  });
}

// المستخدم الحالي. getUser يتحقق من الجلسة لدى Supabase ولا يثق بالكوكي وحده
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!authConfigured()) return null;
  try {
    const sb = await supabaseAuth();
    const { data } = await sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? '' } : null;
  } catch {
    return null;
  }
});
