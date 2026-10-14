'use client';

import { useState } from 'react';
import { thumbUrl } from '@/lib/images';

export default function ImageGallery({
  images,
  alt,
  icon,
}: {
  images: string[];
  alt: string;
  icon: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 text-8xl">
        {icon}
      </div>
    );
  }

  return (
    <div>
      <div className="relative bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active]}
          alt={alt}
          fetchPriority={active === 0 ? 'high' : 'auto'}
          decoding="async"
          className="h-80 w-full object-contain md:h-[28rem]"
        />
        {images.length > 1 && (
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
            {active + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                i === active ? 'ring-emerald-700' : 'ring-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`عرض الصورة ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(src) ?? src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
