// هيكل بسيط يظهر أثناء الانتقال بين الصفحات بدل الشاشة الفارغة
export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-10" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="mb-6 h-8 w-56 rounded-lg bg-stone-200 motion-safe:animate-pulse" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            <div className="h-44 bg-stone-200 motion-safe:animate-pulse" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-24 rounded bg-stone-200 motion-safe:animate-pulse" />
              <div className="h-4 w-full rounded bg-stone-200 motion-safe:animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-stone-200 motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
