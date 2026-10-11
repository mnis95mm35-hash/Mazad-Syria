import type { Currency } from '@/lib/taxonomy';

// يعرض السعر حسب عملته: $1,200 أو 1,200,000 ل.س
export function formatPrice(price: number, currency: Currency | string | undefined | null): string {
  const n = Number(price).toLocaleString('en-US');
  return currency === 'SYP' ? `${n} ل.س` : `$${n}`;
}
