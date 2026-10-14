'use client';

import { useEffect } from 'react';

/**
 * تأثيرات تفاعلية خفيفة بالمؤشر (ميل البطاقات، مغناطيس الأزرار، بقعة ضوء الهيرو).
 * مستمع واحد فقط على الصفحة، ويعمل داخل requestAnimationFrame، ولا يعمل إطلاقاً
 * على شاشات اللمس أو عند تفعيل «تقليل الحركة»، فلا يكلّف الموبايل شيئاً.
 */
export default function MotionFX() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduce.matches) return;

    let raf = 0;
    let last: PointerEvent | null = null;
    let tilted: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;

    const resetTilt = (el: HTMLElement) => {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    };
    const resetMagnet = (el: HTMLElement) => {
      el.style.removeProperty('--tx');
      el.style.removeProperty('--ty');
    };

    const frame = () => {
      raf = 0;
      const e = last;
      if (!e) return;
      const t = e.target instanceof Element ? e.target : null;

      const spot = t?.closest<HTMLElement>('[data-spot]');
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`);
        spot.style.setProperty('--my', `${e.clientY - r.top}px`);
      }

      const tilt = t?.closest<HTMLElement>('[data-tilt]') ?? null;
      if (tilted && tilted !== tilt) resetTilt(tilted);
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty('--ry', `${(px * 12).toFixed(2)}deg`);
        tilt.style.setProperty('--rx', `${(-py * 12).toFixed(2)}deg`);
      }
      tilted = tilt;

      const mag = t?.closest<HTMLElement>('[data-magnet]') ?? null;
      if (magnet && magnet !== mag) resetMagnet(magnet);
      if (mag) {
        const r = mag.getBoundingClientRect();
        const px = (e.clientX - (r.left + r.width / 2)) / r.width;
        const py = (e.clientY - (r.top + r.height / 2)) / r.height;
        mag.style.setProperty('--tx', `${(px * 14).toFixed(1)}px`);
        mag.style.setProperty('--ty', `${(py * 10).toFixed(1)}px`);
      }
      magnet = mag;
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onLeave = () => {
      if (tilted) resetTilt(tilted);
      if (magnet) resetMagnet(magnet);
      tilted = magnet = null;
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
