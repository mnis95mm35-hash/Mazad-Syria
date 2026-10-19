import { CATEGORIES, CITIES } from '@/lib/sample_data';

// قراءة جدول نصي (CSV أو منسوخ من Excel/Sheets) مع دعم الاقتباس والفواصل: , ; أو Tab
export function parseTable(text: string): string[][] {
  const clean = text.replace(/^﻿/, '').replace(/\r/g, '');
  const first = clean.split('\n', 1)[0] ?? '';
  const delim = first.includes('\t') ? '\t' : (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (c === '\n') {
      row.push(cell.trim());
      if (row.some((x) => x)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x)) rows.push(row);
  return rows;
}

// أسماء الأعمدة المقبولة (عربي أو إنجليزي) -> اسم حقل النموذج
const HEADERS: Record<string, string> = {
  العنوان: 'title', title: 'title',
  السعر: 'price', price: 'price',
  العملة: 'currency', currency: 'currency',
  القسم: 'category', category: 'category',
  'القسم الفرعي': 'subcategory', subcategory: 'subcategory',
  المحافظة: 'city', المدينة: 'city', city: 'city',
  المنطقة: 'area', area: 'area',
  الهاتف: 'sellerPhone', phone: 'sellerPhone',
  الاسم: 'sellerName', name: 'sellerName',
  الوصف: 'description', description: 'description',
  السنة: 'carYear', caryear: 'carYear',
  الكيلومترات: 'carKm', carkm: 'carKm',
  الغرف: 'rooms', rooms: 'rooms',
  المساحة: 'sizeM2', sizem2: 'sizeM2',
};

export function mapHeader(h: string): string | null {
  const k = h.trim().toLowerCase();
  return HEADERS[k] ?? HEADERS[h.trim()] ?? null;
}

export function normCurrency(v: string): string {
  const s = v.trim().toLowerCase();
  if (!s || /^(usd|\$|دولار|دولار أمريكي)$/.test(s)) return 'USD';
  if (/^(syp|ليرة|ل\.?س|ليرة سورية)$/.test(s)) return 'SYP';
  return v.trim();
}

export function normCategory(v: string): string {
  const s = v.trim();
  return CATEGORIES.find((c) => c.slug === s.toLowerCase() || c.label === s)?.slug ?? s;
}

export function normCity(v: string): string {
  const s = v.trim();
  return CITIES.find((c) => c === s) ?? s;
}
