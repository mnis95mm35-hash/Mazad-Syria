'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-black">حدث خطأ غير متوقع</h1>
      <p className="mt-3 text-gray-600">تعذّر تحميل الصفحة الآن. حاول مرة أخرى بعد قليل.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="rounded-xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-800">
          إعادة المحاولة
        </button>
        <a href="/" className="rounded-xl bg-stone-200 px-6 py-3 font-bold hover:bg-stone-300">
          الصفحة الرئيسية
        </a>
      </div>
    </div>
  );
}
