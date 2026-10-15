'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LMap, Marker } from 'leaflet';
import { CITY_CENTERS, SYRIA_CENTER, inSyria } from '@/lib/attributes';

type Pos = { lat: number; lng: number };

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// تحديد موقع الإعلان على خريطة OpenStreetMap: بالنقر، أو بسحب الدبوس، أو بزر "موقعي الحالي".
// يرسل lat وlng مع النموذج، وكلاهما اختياري.
export default function LocationPicker({ city, initial }: { city: string; initial?: Pos | null }) {
  const [open, setOpen] = useState(Boolean(initial));
  const [pos, setPos] = useState<Pos | null>(initial ?? null);
  const [msg, setMsg] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const posRef = useRef<Pos | null>(pos);
  posRef.current = pos;

  // نبني الخريطة عند فتحها فقط، حتى لا نحمّل بلاطاتها لمن لا يحتاجها
  useEffect(() => {
    if (!open || !box.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !box.current) return;
      leaflet.current = L;
      const start = posRef.current ? ([posRef.current.lat, posRef.current.lng] as [number, number]) : (CITY_CENTERS[city] ?? SYRIA_CENTER);
      const m = L.map(box.current, { center: start, zoom: posRef.current ? 16 : CITY_CENTERS[city] ? 12 : 7 });
      L.tileLayer(TILES, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
      m.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
      map.current = m;
      if (posRef.current) drawMarker(posRef.current.lat, posRef.current.lng);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // عند تغيير المحافظة وقبل اختيار موقع نحرّك الخريطة إليها
  useEffect(() => {
    if (map.current && !posRef.current && CITY_CENTERS[city]) map.current.setView(CITY_CENTERS[city], 12);
  }, [city]);

  function drawMarker(lat: number, lng: number) {
    const L = leaflet.current;
    const m = map.current;
    if (!L || !m) return;
    if (marker.current) {
      marker.current.setLatLng([lat, lng]);
      return;
    }
    const icon = L.divIcon({
      className: '',
      html: '<div style="font-size:30px;line-height:1;transform:translate(-50%,-100%)">📍</div>',
      iconSize: [0, 0],
    });
    const mk = L.marker([lat, lng], { icon, draggable: true }).addTo(m);
    mk.on('dragend', () => {
      const p = mk.getLatLng();
      place(p.lat, p.lng, false);
    });
    marker.current = mk;
  }

  function place(lat: number, lng: number, move = true) {
    if (!inSyria(lat, lng)) {
      setMsg('الموقع خارج سوريا، اختر نقطة داخلها.');
      return;
    }
    setMsg('');
    setPos({ lat, lng });
    drawMarker(lat, lng);
    if (move) map.current?.panTo([lat, lng]);
  }

  function locate() {
    if (!navigator.geolocation) {
      setMsg('متصفحك لا يدعم تحديد الموقع.');
      return;
    }
    setMsg('جارٍ تحديد موقعك...');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        place(p.coords.latitude, p.coords.longitude);
        map.current?.setView([p.coords.latitude, p.coords.longitude], 16);
      },
      () => setMsg('تعذّر تحديد موقعك. اسمح للموقع بالوصول لموقعك أو انقر على الخريطة.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clear() {
    marker.current?.remove();
    marker.current = null;
    setPos(null);
    setMsg('');
  }

  const btn = 'rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100';

  return (
    <div>
      <input type="hidden" name="lat" value={pos?.lat ?? ''} />
      <input type="hidden" name="lng" value={pos?.lng ?? ''} />
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={btn}>
          📍 إضافة موقعي على الخريطة
        </button>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={locate} className={btn}>
              🎯 استخدم موقعي الحالي
            </button>
            {pos && (
              <button type="button" onClick={clear} className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-bold hover:bg-stone-200">
                إزالة الموقع
              </button>
            )}
            <span className="text-xs text-gray-500">{pos ? 'تم تحديد الموقع، اسحب الدبوس لتعديله.' : 'انقر على الخريطة لوضع الدبوس.'}</span>
          </div>
          <div ref={box} className="z-0 h-72 w-full overflow-hidden rounded-xl ring-1 ring-black/10" dir="ltr" />
          {msg && <p className="mt-2 text-xs text-amber-700">{msg}</p>}
        </div>
      )}
    </div>
  );
}
