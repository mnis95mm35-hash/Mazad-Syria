import Link from 'next/link';

export default function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return qs ? `/?${qs}` : '/';
  };

  // نعرض الأولى والأخيرة والصفحات القريبة من الحالية
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2,
  );

  const base = 'rounded-xl px-4 py-2 text-sm font-bold ring-1 ring-black/5';

  return (
    <nav aria-label="التنقل بين الصفحات" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={`${base} bg-white hover:bg-stone-100`}>
          السابق
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="text-gray-400">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${base} ${p === page ? 'bg-emerald-900 text-white' : 'bg-white hover:bg-stone-100'}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount && (
        <Link href={href(page + 1)} rel="next" className={`${base} bg-white hover:bg-stone-100`}>
          التالي
        </Link>
      )}
    </nav>
  );
}
