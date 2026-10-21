import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layout/main_layout';
import { isAdmin } from '@/lib/admin_auth';
import { drafts, type Draft } from '@/lib/drafts_service';
import { recentJobRuns } from '@/lib/job_log';
import { toWhatsAppNumber } from '@/lib/phone';
import { CATEGORIES, CITIES } from '@/lib/sample_data';
import {
  addDraftsAction,
  deleteDraftAction,
  publishDraftAction,
  setDraftStatusAction,
  updateDraftAction,
} from '@/app/admin/drafts/actions';

export const metadata: Metadata = { title: 'مسودات الإعلانات', robots: { index: false } };
export const dynamic = 'force-dynamic';

const input = 'w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm';
const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  invited: 'تمت دعوة صاحبها',
  claimed: 'طالب بها صاحبها',
  published: 'منشورة',
  rejected: 'مرفوضة',
};

function DraftCard({ d }: { d: Draft }) {
  const days = Math.max(Math.ceil((d.expiresAt.getTime() - Date.now()) / 86_400_000), 0);
  const open = d.status !== 'published' && d.status !== 'rejected';
  return (
    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-black/10">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 font-bold">{STATUS_LABEL[d.status] ?? d.status}</span>
        {open && <span className="text-gray-500">تُحذف تلقائياً بعد {days} يوماً إن لم يُطالَب بها</span>}
        {d.status === 'published' && d.listingId && (
          <Link href={`/listings/${d.listingId}`} className="font-bold text-emerald-800 hover:underline">فتح الإعلان #{d.listingId}</Link>
        )}
      </div>

      <form action={updateDraftAction} className="space-y-2">
        <input type="hidden" name="id" value={d.id} />
        <input name="title" defaultValue={d.title} className={input} aria-label="العنوان" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input name="price" defaultValue={d.price ?? ''} inputMode="decimal" placeholder="السعر" aria-label="السعر" className={input} />
          <select name="currency" defaultValue={d.currency} aria-label="العملة" className={input}>
            <option value="USD">دولار $</option>
            <option value="SYP">ليرة سورية</option>
          </select>
          <select name="category" defaultValue={d.category ?? ''} aria-label="القسم" className={input}>
            <option value="">القسم؟</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
          <select name="city" defaultValue={d.city ?? ''} aria-label="المحافظة" className={input}>
            <option value="">المحافظة؟</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input name="sellerName" defaultValue={d.sellerName ?? ''} placeholder="اسم البائع" aria-label="اسم البائع" className={input} />
          <input name="sellerPhone" defaultValue={d.sellerPhone ?? ''} dir="ltr" placeholder="الهاتف" aria-label="الهاتف" className={input} />
        </div>
        <details>
          <summary className="cursor-pointer text-xs text-gray-500">الوصف والنص الأصلي</summary>
          <p className="mt-2 whitespace-pre-line text-sm leading-7">{d.description}</p>
        </details>
        {d.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {d.images.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-black/10" />
            ))}
          </div>
        )}
        {open && <button className="rounded-lg bg-stone-200 px-4 py-1.5 text-sm font-bold hover:bg-stone-300">حفظ التعديلات</button>}
      </form>

      {open && (
        <div className="space-y-3 border-t border-black/5 pt-3">
          <form action={publishDraftAction} className="space-y-2">
            <input type="hidden" name="id" value={d.id} />
            <input name="consentNote" defaultValue={d.consentNote ?? ''} placeholder="كيف وافق صاحبها؟ مثال: واتساب 21/10 من الرقم نفسه" className={input} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" value="yes" className="mt-1" />
              <span>أؤكد أن صاحب الإعلان وافق على نشره في الموقع</span>
            </label>
            <button className="rounded-lg bg-emerald-800 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-700">نشر الإعلان</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {d.sellerPhone && (
              <a
                href={`https://wa.me/${toWhatsAppNumber(d.sellerPhone)}?text=${encodeURIComponent(`مرحباً، وصلنا إعلانك «${d.title}» على مزاد سوريا. هل تؤكد نشره؟`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-900 hover:bg-green-200"
              >
                راسله على واتساب للتأكيد
              </a>
            )}
            {d.status === 'draft' && (
              <form action={setDraftStatusAction}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="status" value="invited" />
                <button className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200">تمت مراسلة صاحبها</button>
              </form>
            )}
            <form action={setDraftStatusAction}>
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="status" value="rejected" />
              <button className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100">رفض</button>
            </form>
            <form action={deleteDraftAction}>
              <input type="hidden" name="id" value={d.id} />
              <button className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100">حذف</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default async function DraftsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; s?: string }> }) {
  if (!(await isAdmin())) redirect('/admin');
  const sp = await searchParams;
  const view = sp.s === 'published' || sp.s === 'rejected' ? sp.s : 'open';

  let list: Draft[] = [];
  let setupError = '';
  try {
    list = await drafts.list(view);
  } catch (e) {
    setupError = e instanceof Error ? e.message : 'خطأ';
  }
  const runs = await recentJobRuns(15);

  return (
    <MainLayout>
      <Link href="/admin" className="text-sm font-semibold text-emerald-800 hover:underline">← لوحة الإدارة</Link>
      <h1 className="mt-3 text-3xl font-black">مسودات الإعلانات</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
        هنا تُجمع نصوص أرسلها أصحابها أو وافقوا عليها. لا تظهر للزوار أبداً، ولا تُنشر إلا بعد تأكيد موافقة صاحبها.
        المسودات التي لا يُطالَب بها تُحذف تلقائياً بعد 14 يوماً.
      </p>

      {sp.ok && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900">{sp.ok}</p>}
      {sp.err && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{sp.err}</p>}
      {setupError && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          تعذّر قراءة المسودات ({setupError}). شغّل ملف sql/phase9.sql في Supabase أولاً.
        </p>
      )}

      <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="mb-3 text-xl font-extrabold">أضف منشورات إلى المسودات</h2>
        <form action={addDraftsAction} className="space-y-3">
          <textarea name="text" rows={7} className={`${input} font-mono`} placeholder={'الصق منشورات أرسلها أصحابها (1 2 3 أو --- أو سطر فارغ بينها)'} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="defaultName" placeholder="اسم افتراضي (اختياري)" className={input} />
            <input name="defaultPhone" dir="ltr" placeholder="هاتف افتراضي (اختياري)" className={input} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="single" value="yes" />
            هذا النص إعلان واحد (لا تقسّمه إلى عدة إعلانات)
          </label>
          <button className="rounded-lg bg-emerald-800 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">أضف كمسودات</button>
        </form>
      </section>

      <div className="mt-6 flex gap-2 text-sm font-bold">
        {[
          ['open', 'المفتوحة'],
          ['published', 'المنشورة'],
          ['rejected', 'المرفوضة'],
        ].map(([k, label]) => (
          <Link key={k} href={`/admin/drafts?s=${k}`} className={`rounded-full px-4 py-1.5 ${view === k ? 'bg-emerald-800 text-white' : 'bg-stone-200'}`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.length === 0 && !setupError && <p className="text-sm text-gray-500">لا توجد مسودات هنا.</p>}
        {list.map((d) => (
          <DraftCard key={d.id} d={d} />
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-extrabold">آخر المهام الخلفية</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-gray-500">لا سجلات بعد.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {runs.map((r) => (
              <li key={r.id} className={r.ok ? 'text-gray-700' : 'font-bold text-red-700'}>
                {r.ok ? '✅' : '❌'} {r.job} · {r.createdAt.toLocaleString('en-GB')} · {r.ms ?? 0}ms {r.detail ? `· ${r.detail}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </MainLayout>
  );
}
