// أسباب الرفض الجاهزة: يختار المراجع سبباً ويضيف ملاحظة اختيارية، ويراها صاحب الإعلان في حسابه
export const REJECT_REASONS = [
  'صور غير واضحة أو لا تخص السلعة',
  'السعر أو المعلومات غير منطقية',
  'محتوى مخالف لشروط الاستخدام',
  'إعلان مكرر',
  'بيانات التواصل غير صحيحة',
  'سلعة أو خدمة غير مسموح بها',
  'أخرى',
] as const;

export function buildReason(reason: unknown, note: unknown): string | null {
  const r = String(reason ?? '');
  if (!(REJECT_REASONS as readonly string[]).includes(r)) return null;
  const n = String(note ?? '').trim().slice(0, 200);
  return n ? `${r}: ${n}` : r;
}
