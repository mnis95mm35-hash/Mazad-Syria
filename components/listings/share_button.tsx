'use client';

import { useState } from 'react';

// مشاركة: قائمة المشاركة في الجوال، وإلا نسخ الرابط. وزر واتساب مباشر
export default function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;

  async function share() {
    const link = url();
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url: link });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // ألغى المستخدم
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('انسخ الرابط:', link);
    }
  }

  function whatsapp() {
    const text = `${title}\n${url()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={share} className="rounded-xl bg-stone-100 py-3 text-sm font-bold hover:bg-stone-200">
        {copied ? '✓ تم نسخ الرابط' : '🔗 مشاركة'}
      </button>
      <button type="button" onClick={whatsapp} className="rounded-xl bg-green-50 py-3 text-sm font-bold text-green-800 hover:bg-green-100">
        💬 أرسل واتساب
      </button>
    </div>
  );
}
