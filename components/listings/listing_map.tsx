'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// خريطة للقراءة فقط في صفحة الإعلان.
// exact = دبوس دقيق (للعقارات)، وإلا دائرة تقريبية نحو 400م لحماية خصوصية البائع.
export default function ListingMap({ lat, lng, exact }: { lat: number; lng: number; exact: boolean }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !box.current) return;
      map = L.map(box.current, { center: [lat, lng], zoom: exact ? 16 : 14, scrollWheelZoom: false });
      L.tileLayer(TILES, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      if (exact) {
        const icon = L.divIcon({
          className: '',
          html: '<div style="font-size:30px;line-height:1;transform:translate(-50%,-100%)">📍</div>',
          iconSize: [0, 0],
        });
        L.marker([lat, lng], { icon }).addTo(map);
      } else {
        L.circle([lat, lng], { radius: 400, color: '#065f46', weight: 2, fillColor: '#10b981', fillOpacity: 0.2 }).addTo(map);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, exact]);

  return (
    <div>
      <div ref={box} className="z-0 h-64 w-full overflow-hidden rounded-2xl ring-1 ring-black/10" dir="ltr" />
      <p className="mt-2 text-xs text-gray-500">
        {exact ? 'موقع العقار على الخريطة.' : 'الموقع تقريبي (منطقة البائع) وليس عنواناً دقيقاً.'}{' '}
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-emerald-800 hover:underline"
        >
          فتح في خريطة أكبر
        </a>
      </p>
    </div>
  );
}
