import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import FbImport from '@/components/account/fb_import';
import { getCurrentUser } from '@/lib/supabase_auth';
import { turnstileSiteKey } from '@/lib/turnstile';

export const metadata: Metadata = { title: 'استيراد إعلاناتي من فيسبوك', robots: { index: false } };

export default async function Page() {
  if (!(await getCurrentUser())) redirect('/login?next=/account/import');
  return (
    <MainLayout>
      <Link href="/account" className="text-sm font-semibold text-emerald-800 hover:underline">← إعلاناتي</Link>
      <h1 className="mt-3 text-3xl font-black">استيراد إعلاناتي من فيسبوك</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
        انقل منشوراتك مع صورها من حسابك أو صفحتك إلى مزاد سوريا دفعة واحدة. يجري كل شيء داخل متصفحك: لا نرى ملف فيسبوك ولا حسابك،
        ولا يُرسل إلينا إلا ما تختاره بنفسك.
      </p>

      <details open className="mt-5 max-w-2xl rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <summary className="cursor-pointer text-lg font-extrabold">الخطوة 1: نزّل منشوراتك من فيسبوك</summary>
        <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm leading-7">
          <li>في فيسبوك: <b>الإعدادات والخصوصية ← الإعدادات ← مركز الحسابات ← معلوماتك وأذوناتك ← تنزيل معلوماتك</b>.</li>
          <li>اختر <b>تنزيل أو نقل المعلومات</b> ثم حسابك (أو صفحتك إن كانت تنشر إعلاناتك)، ثم <b>معلومات محددة</b> واختر <b>المنشورات</b> فقط.</li>
          <li>اختر <b>التنزيل على الجهاز</b>، والنطاق الزمني الذي تريده، وفي الصيغة اختر <b className="text-red-700">JSON</b> (وليس HTML)، وجودة الوسائط <b>متوسطة</b> أو عالية.</li>
          <li>انتظر إشعار فيسبوك بجاهزية الملف (من دقائق إلى ساعات)، ثم نزّله. هو ملف مضغوط ZIP، وقد يكون على عدة أجزاء: اخترها كلها معاً في الخطوة التالية.</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">أسماء القوائم تتغير قليلاً بين إصدارات فيسبوك. إن لم تجدها ابحث في الإعدادات عن «تنزيل معلوماتك».</p>
      </details>

      <div className="mt-5 max-w-3xl">
        <FbImport captchaSiteKey={turnstileSiteKey()} />
      </div>
    </MainLayout>
  );
}
