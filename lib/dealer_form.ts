import { CITIES } from '@/lib/sample_data';
import { isValidPhone } from '@/lib/phone';
import type { DealerInput } from '@/lib/dealers_service';

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type DealerFields = Omit<DealerInput, 'logoUrl'>;

// تحقق موحّد لنموذج التاجر. الرابط (slug) يُتحقق منه عند الإنشاء فقط
export function parseDealerFields(fd: FormData, opts: { needSlug: boolean }): { error: string } | { fields: DealerFields } {
  const name = String(fd.get('name') ?? '').trim();
  const slug = String(fd.get('slug') ?? '').trim().toLowerCase();
  const description = String(fd.get('description') ?? '').trim();
  const phone = String(fd.get('phone') ?? '').trim();
  const city = String(fd.get('city') ?? '');
  const address = String(fd.get('address') ?? '').trim();

  if (name.length < 2 || name.length > 60) return { error: 'اسم المعرض يجب أن يكون بين 2 و60 حرفاً.' };
  if (opts.needSlug) {
    if (slug.length < 3 || slug.length > 40 || !SLUG_RE.test(slug)) {
      return { error: 'رابط المعرض: أحرف إنجليزية صغيرة وأرقام وشرطات فقط (3 إلى 40)، مثل al-noor-cars.' };
    }
  }
  if (description.length > 1000) return { error: 'الوصف طويل (الحد 1000 حرف).' };
  if (!phone || !isValidPhone(phone)) return { error: 'أدخل رقم هاتف صالحاً للتواصل.' };
  if (city && !CITIES.includes(city)) return { error: 'اختر محافظة من القائمة.' };
  if (address.length > 200) return { error: 'العنوان طويل (الحد 200 حرف).' };

  return {
    fields: {
      slug,
      name,
      description: description || null,
      phone,
      city: city || null,
      address: address || null,
    },
  };
}
