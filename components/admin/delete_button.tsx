'use client';

import { deleteListingAction } from '@/app/admin/actions';

export default function DeleteButton({ id, title }: { id: number; title: string }) {
  return (
    <form
      action={deleteListingAction}
      onSubmit={(e) => {
        if (!confirm(`حذف الإعلان نهائياً؟\n\n${title}`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">
        حذف
      </button>
    </form>
  );
}
