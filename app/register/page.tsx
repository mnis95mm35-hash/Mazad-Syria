import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import AuthForm from '@/components/auth/auth_form';
import { getCurrentUser } from '@/lib/supabase_auth';

export const metadata: Metadata = {
  title: 'إنشاء حساب',
  robots: { index: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect('/account');
  const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined;
  return (
    <MainLayout>
      <AuthForm mode="register" next={safe} />
    </MainLayout>
  );
}
