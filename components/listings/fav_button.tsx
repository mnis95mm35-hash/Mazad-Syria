'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toggleFavoriteAction } from '@/app/favorites/actions';

// مخزن بسيط مشترك بين كل الأزرار في الصفحة: نجلب المفضلة مرة واحدة
let ids = new Set<number>();
let loaded = false;
let loading = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function load() {
  if (loaded || loading) return;
  loading = true;
  fetch('/api/favorites', { cache: 'no-store' })
    .then((r) => r.json())
    .then((d: { ids?: number[] }) => {
      ids = new Set(d.ids ?? []);
      loaded = true;
      emit();
    })
    .catch(() => {})
    .finally(() => {
      loading = false;
    });
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};

export default function FavButton({ id, variant = 'icon' }: { id: number; variant?: 'icon' | 'full' }) {
  const router = useRouter();
  const path = usePathname();
  const fav = useSyncExternalStore(subscribe, () => ids.has(id), () => false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    load();
  }, []);

  const click = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      setBusy(true);
      setMsg('');
      const was = ids.has(id);
      // تحديث متفائل
      ids = new Set(ids);
      if (was) ids.delete(id);
      else ids.add(id);
      emit();
      try {
        const r = await toggleFavoriteAction(id);
        if (r.needLogin) {
          ids = new Set(ids);
          ids.delete(id);
          emit();
          router.push(`/login?next=${encodeURIComponent(path || '/')}`);
          return;
        }
        if (!r.ok) throw new Error(r.error);
      } catch (err) {
        // نرجع للحالة السابقة
        ids = new Set(ids);
        if (was) ids.add(id);
        else ids.delete(id);
        emit();
        setMsg(err instanceof Error && err.message ? err.message : 'تعذّر الحفظ.');
      } finally {
        setBusy(false);
      }
    },
    [busy, id, path, router],
  );

  if (variant === 'full') {
    return (
      <>
        <button
          type="button"
          onClick={click}
          aria-pressed={fav}
          className={`w-full rounded-xl py-3 text-center text-sm font-bold transition ${
            fav ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-stone-100 hover:bg-stone-200'
          }`}
        >
          {fav ? '♥ في المفضلة (إزالة)' : '♡ أضف للمفضلة'}
        </button>
        {msg && <p className="mt-1 text-xs text-red-700">{msg}</p>}
      </>
    );
  }
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={fav}
      aria-label={fav ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
      title={msg || (fav ? 'إزالة من المفضلة' : 'أضف للمفضلة')}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-lg shadow backdrop-blur transition hover:scale-110 ${
        fav ? 'bg-white text-rose-600' : 'bg-white/90 text-gray-600'
      }`}
    >
      {fav ? '♥' : '♡'}
    </button>
  );
}
