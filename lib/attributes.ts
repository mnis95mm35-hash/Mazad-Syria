import type { Listing } from '@/lib/sample_data';

// ===== خيارات المواصفات =====
export const CONDITIONS = [
  { v: 'new', label: 'جديد' },
  { v: 'used', label: 'مستعمل' },
] as const;
export const GEARBOXES = [
  { v: 'auto', label: 'أوتوماتيك' },
  { v: 'manual', label: 'عادي (يدوي)' },
] as const;
export const FUELS = [
  { v: 'petrol', label: 'بنزين' },
  { v: 'diesel', label: 'مازوت' },
  { v: 'hybrid', label: 'هجين' },
  { v: 'electric', label: 'كهرباء' },
  { v: 'gas', label: 'غاز' },
] as const;

const labelOf = (list: readonly { v: string; label: string }[], v?: string | null) =>
  list.find((o) => o.v === v)?.label ?? null;
const inList = (list: readonly { v: string }[], v: string) => list.some((o) => o.v === v);

// المواصفات والموقع كما تُحفظ مع الإعلان
export type ListingExtras = {
  condition: string | null;
  carYear: number | null;
  carKm: number | null;
  gearbox: string | null;
  fuel: string | null;
  rooms: number | null;
  sizeM2: number | null;
  furnished: boolean | null;
  lat: number | null;
  lng: number | null;
};

export const EMPTY_EXTRAS: ListingExtras = {
  condition: null,
  carYear: null,
  carKm: null,
  gearbox: null,
  fuel: null,
  rooms: null,
  sizeM2: null,
  furnished: null,
  lat: null,
  lng: null,
};

// أي الحقول تناسب هذا القسم والقسم الفرعي
export function fieldsFor(category: string, sub?: string | null) {
  const home = category === 'real-estate' && sub !== 'land' && sub !== 'shops-offices';
  return {
    condition: category === 'cars' || category === 'electronics' || category === 'furniture',
    car: category === 'cars',
    home, // غرف + مفروش
    size: category === 'real-estate', // المساحة
  };
}

// مدن مركزية لتوسيط الخريطة عند اختيار المحافظة
export const CITY_CENTERS: Record<string, [number, number]> = {
  دمشق: [33.5138, 36.2765],
  'ريف دمشق': [33.55, 36.4],
  حلب: [36.2021, 37.1343],
  حمص: [34.7324, 36.7137],
  حماة: [35.1318, 36.7578],
  اللاذقية: [35.5317, 35.79],
  طرطوس: [34.889, 35.8866],
  إدلب: [35.9306, 36.6339],
  'دير الزور': [35.3359, 40.1408],
  الرقة: [35.9528, 39.0079],
  الحسكة: [36.5024, 40.7477],
  درعا: [32.6189, 36.1021],
  السويداء: [32.709, 36.5695],
  القنيطرة: [33.1257, 35.8244],
};
export const SYRIA_CENTER: [number, number] = [34.8, 38.5];

// حدود سوريا التقريبية: نرفض أي إحداثيات خارجها
const BOUNDS = { latMin: 32.0, latMax: 37.5, lngMin: 35.5, lngMax: 42.5 };
export const inSyria = (lat: number, lng: number) =>
  lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax;

function intField(fd: FormData, name: string, label: string, min: number, max: number): { error: string } | { value: number | null } {
  const raw = String(fd.get(name) ?? '').trim();
  if (!raw) return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return { error: `${label}: أدخل رقماً صحيحاً بين ${min} و${max}.` };
  return { value: n };
}

// يقرأ المواصفات والموقع من النموذج، ويتجاهل ما لا يخص القسم المختار
export function parseExtras(category: string, sub: string | null, fd: FormData): { error: string } | { extras: ListingExtras } {
  const f = fieldsFor(category, sub);
  const out: ListingExtras = { ...EMPTY_EXTRAS };

  if (f.condition) {
    const v = String(fd.get('condition') ?? '');
    if (v) {
      if (!inList(CONDITIONS, v)) return { error: 'حالة السلعة غير صالحة.' };
      out.condition = v;
    }
  }
  if (f.car) {
    const year = intField(fd, 'carYear', 'سنة الصنع', 1950, new Date().getFullYear() + 1);
    if ('error' in year) return year;
    const km = intField(fd, 'carKm', 'الكيلومترات', 0, 3_000_000);
    if ('error' in km) return km;
    out.carYear = year.value;
    out.carKm = km.value;
    const gearbox = String(fd.get('gearbox') ?? '');
    if (gearbox) {
      if (!inList(GEARBOXES, gearbox)) return { error: 'نوع ناقل الحركة غير صالح.' };
      out.gearbox = gearbox;
    }
    const fuel = String(fd.get('fuel') ?? '');
    if (fuel) {
      if (!inList(FUELS, fuel)) return { error: 'نوع الوقود غير صالح.' };
      out.fuel = fuel;
    }
  }
  if (f.home) {
    const rooms = intField(fd, 'rooms', 'عدد الغرف', 1, 20);
    if ('error' in rooms) return rooms;
    out.rooms = rooms.value;
    const furnished = String(fd.get('furnished') ?? '');
    if (furnished === 'yes') out.furnished = true;
    else if (furnished === 'no') out.furnished = false;
    else if (furnished) return { error: 'قيمة "مفروش" غير صالحة.' };
  }
  if (f.size) {
    const size = intField(fd, 'sizeM2', 'المساحة', 1, 1_000_000);
    if ('error' in size) return size;
    out.sizeM2 = size.value;
  }

  // الموقع: الاثنان معاً أو لا شيء، داخل حدود سوريا، بدقة 5 منازل (نحو متر واحد)
  const latRaw = String(fd.get('lat') ?? '').trim();
  const lngRaw = String(fd.get('lng') ?? '').trim();
  if (latRaw || lngRaw) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!latRaw || !lngRaw || !Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'موقع الخريطة غير صالح.' };
    if (!inSyria(lat, lng)) return { error: 'الموقع المحدد خارج سوريا.' };
    out.lat = Math.round(lat * 1e5) / 1e5;
    out.lng = Math.round(lng * 1e5) / 1e5;
  }
  return { extras: out };
}

// ===== الفلاتر في صفحات التصنيف =====
export type ExtraFilters = {
  yearFrom?: number;
  yearTo?: number;
  kmTo?: number;
  gearbox?: string;
  fuel?: string;
  condition?: string;
  roomsFrom?: number;
  sizeFrom?: number;
  sizeTo?: number;
};
export const EXTRA_FILTER_KEYS = ['yearFrom', 'yearTo', 'kmTo', 'gearbox', 'fuel', 'condition', 'roomsFrom', 'sizeFrom', 'sizeTo'] as const;
export type ExtraFilterRaw = Partial<Record<(typeof EXTRA_FILTER_KEYS)[number], string>>;

export function parseExtraFilters(raw: ExtraFilterRaw, category: string): ExtraFilters {
  const f = fieldsFor(category);
  const num = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const out: ExtraFilters = {};
  if (f.car) {
    out.yearFrom = num(raw.yearFrom);
    out.yearTo = num(raw.yearTo);
    out.kmTo = num(raw.kmTo);
    if (raw.gearbox && inList(GEARBOXES, raw.gearbox)) out.gearbox = raw.gearbox;
    if (raw.fuel && inList(FUELS, raw.fuel)) out.fuel = raw.fuel;
  }
  if (f.condition && raw.condition && inList(CONDITIONS, raw.condition)) out.condition = raw.condition;
  if (category === 'real-estate') {
    out.roomsFrom = num(raw.roomsFrom);
    out.sizeFrom = num(raw.sizeFrom);
    out.sizeTo = num(raw.sizeTo);
  }
  return out;
}

// لإبقاء الفلاتر في روابط الصفحات (ترقيم الصفحات)
export function extraFilterParams(raw: ExtraFilterRaw, applied: ExtraFilters): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of EXTRA_FILTER_KEYS) out[k] = applied[k] !== undefined ? raw[k] : undefined;
  return out;
}

// ===== العرض =====
const n = (v: number) => v.toLocaleString('en-US');

// قائمة مواصفات للعرض في صفحة الإعلان: [التسمية، القيمة]
export function specsOf(l: Listing): [string, string][] {
  const out: [string, string][] = [];
  const cond = labelOf(CONDITIONS, l.condition);
  if (cond) out.push(['الحالة', cond]);
  if (l.carYear) out.push(['سنة الصنع', String(l.carYear)]);
  if (l.carKm !== null && l.carKm !== undefined) out.push(['الكيلومترات', `${n(l.carKm)} كم`]);
  const gb = labelOf(GEARBOXES, l.gearbox);
  if (gb) out.push(['ناقل الحركة', gb]);
  const fuel = labelOf(FUELS, l.fuel);
  if (fuel) out.push(['الوقود', fuel]);
  if (l.rooms) out.push(['عدد الغرف', String(l.rooms)]);
  if (l.sizeM2) out.push(['المساحة', `${n(l.sizeM2)} م²`]);
  if (l.furnished !== null && l.furnished !== undefined) out.push(['مفروش', l.furnished ? 'نعم' : 'لا']);
  return out;
}

// نص مختصر لبطاقة القائمة
export function cardChips(l: Listing): string[] {
  const out: string[] = [];
  if (l.carYear) out.push(String(l.carYear));
  if (l.carKm !== null && l.carKm !== undefined) out.push(`${n(l.carKm)} كم`);
  const gb = labelOf(GEARBOXES, l.gearbox);
  if (gb && l.category === 'cars') out.push(gb);
  if (l.rooms) out.push(`${l.rooms} غرف`);
  if (l.sizeM2) out.push(`${n(l.sizeM2)} م²`);
  const cond = labelOf(CONDITIONS, l.condition);
  if (cond && l.category !== 'cars') out.push(cond);
  return out.slice(0, 3);
}
