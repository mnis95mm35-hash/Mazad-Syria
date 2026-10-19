import { CATEGORIES, CITIES } from '@/lib/sample_data';

// أسماء المدن في قاعدة البيانات عربية، ونحتاج لها روابط إنجليزية نظيفة
export const CITY_SLUGS: Record<string, string> = {
  دمشق: 'damascus',
  'ريف دمشق': 'rif-dimashq',
  حلب: 'aleppo',
  حمص: 'homs',
  حماة: 'hama',
  اللاذقية: 'latakia',
  طرطوس: 'tartus',
  إدلب: 'idlib',
  'دير الزور': 'deir-ez-zor',
  الرقة: 'raqqa',
  الحسكة: 'hasakah',
  درعا: 'daraa',
  السويداء: 'suwayda',
  القنيطرة: 'quneitra',
};

export const citySlug = (name: string) => CITY_SLUGS[name] ?? null;
export const cityFromSlug = (slug: string) => CITIES.find((c) => CITY_SLUGS[c] === slug) ?? null;

export type Sub = { slug: string; label: string };

// الأقسام الفرعية لكل قسم
export const SUBCATEGORIES: Record<string, Sub[]> = {
  cars: [
    { slug: 'toyota', label: 'تويوتا' },
    { slug: 'hyundai', label: 'هيونداي' },
    { slug: 'kia', label: 'كيا' },
    { slug: 'nissan', label: 'نيسان' },
    { slug: 'mercedes', label: 'مرسيدس' },
    { slug: 'bmw', label: 'بي إم دبليو' },
    { slug: 'chevrolet', label: 'شيفروليه' },
    { slug: 'other-cars', label: 'ماركات أخرى' },
  ],
  'real-estate': [
    { slug: 'apartment-sale', label: 'شقق للبيع' },
    { slug: 'apartment-rent', label: 'شقق للإيجار' },
    { slug: 'houses-villas', label: 'بيوت وفلل' },
    { slug: 'land', label: 'أراضٍ' },
    { slug: 'shops-offices', label: 'محلات ومكاتب' },
  ],
  electronics: [
    { slug: 'phones', label: 'جوالات' },
    { slug: 'computers', label: 'حواسيب ولابتوبات' },
    { slug: 'tv-audio', label: 'تلفزيونات وصوتيات' },
    { slug: 'accessories', label: 'ملحقات' },
  ],
  furniture: [
    { slug: 'bedrooms', label: 'غرف نوم' },
    { slug: 'living-rooms', label: 'غرف جلوس' },
    { slug: 'kitchens', label: 'مطابخ' },
    { slug: 'home-appliances', label: 'أجهزة منزلية' },
  ],
  jobs: [
    { slug: 'full-time', label: 'دوام كامل' },
    { slug: 'part-time', label: 'دوام جزئي' },
    { slug: 'freelance', label: 'عمل حر' },
  ],
  services: [
    { slug: 'maintenance', label: 'صيانة وتصليح' },
    { slug: 'transport', label: 'نقل وشحن' },
    { slug: 'education', label: 'دروس وتعليم' },
    { slug: 'other-services', label: 'خدمات أخرى' },
  ],
};

export const subsOf = (category: string): Sub[] => SUBCATEGORIES[category] ?? [];
export const subLabel = (category: string, slug?: string | null) =>
  subsOf(category).find((s) => s.slug === slug)?.label ?? null;
export const isValidSub = (category: string, slug: string) => subsOf(category).some((s) => s.slug === slug);

export const categoryExists = (slug: string) => CATEGORIES.some((c) => c.slug === slug);

// مسار صفحة تصنيفية: /cars أو /cars/damascus أو /cars/toyota أو /cars/toyota/damascus
export function browsePath(p: { category: string; sub?: string | null; city?: string | null }) {
  const parts = [p.category];
  if (p.sub) parts.push(p.sub);
  const cs = p.city ? citySlug(p.city) : null;
  if (cs) parts.push(cs);
  return '/' + parts.join('/');
}

export type Currency = 'USD' | 'SYP';
export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'USD', label: 'دولار $' },
  { code: 'SYP', label: 'ليرة سورية' },
];
export const isCurrency = (v: unknown): v is Currency => v === 'USD' || v === 'SYP';

// المدن والبلدات والمناطق داخل كل محافظة (من معرفتي العامة، وتستطيع تعديلها وإضافة غيرها هنا)
export const AREAS: Record<string, string[]> = {
  دمشق: [
    'المزة', 'كفرسوسة', 'المالكي', 'أبو رمانة', 'الشعلان', 'الصالحية', 'ركن الدين', 'المهاجرين',
    'القصاع', 'باب توما', 'العباسيين', 'الميدان', 'الشاغور', 'القابون', 'برزة', 'دمر', 'الزاهرة',
    'اليرموك', 'التضامن', 'القدم', 'العسالي', 'جوبر', 'المجتهد', 'الروضة', 'مشروع دمر', 'ساروجة',
  ],
  'ريف دمشق': [
    'دوما', 'حرستا', 'التل', 'قدسيا', 'الهامة', 'جرمانا', 'صحنايا', 'أشرفية صحنايا', 'داريا',
    'المعضمية', 'الزبداني', 'مضايا', 'بلودان', 'يبرود', 'النبك', 'القطيفة', 'جيرود', 'الكسوة',
    'سقبا', 'عربين', 'زملكا', 'عين ترما', 'جديدة عرطوز', 'قطنا', 'دير عطية', 'معلولا', 'رنكوس',
    'السيدة زينب', 'الضمير', 'عدرا', 'الديماس', 'التل الأبيض',
  ],
  حلب: [
    'مدينة حلب', 'اعزاز', 'الباب', 'منبج', 'عفرين', 'جرابلس', 'السفيرة', 'مسكنة', 'دير حافر',
    'تل رفعت', 'الأتارب', 'عين العرب (كوباني)', 'الراعي', 'دارة عزة', 'خناصر',
  ],
  حمص: [
    'مدينة حمص', 'تدمر', 'القصير', 'الرستن', 'تلبيسة', 'تلكلخ', 'المخرم', 'الحولة', 'القريتين',
    'الفرقلس', 'صدد', 'مهين', 'حسياء',
  ],
  حماة: [
    'مدينة حماة', 'سلمية', 'مصياف', 'محردة', 'السقيلبية', 'صوران', 'كفرزيتا', 'طيبة الإمام',
    'حلفايا', 'مورك', 'سهل الغاب', 'وادي العيون',
  ],
  اللاذقية: [
    'مدينة اللاذقية', 'جبلة', 'القرداحة', 'الحفة', 'كسب', 'سلمى', 'صلنفة', 'رأس البسيط', 'بسنادا',
    'البصة', 'عين البيضا',
  ],
  طرطوس: [
    'مدينة طرطوس', 'دوير الشيخ سعد', 'بانياس', 'صافيتا', 'دريكيش', 'الشيخ بدر', 'القدموس', 'مشتى الحلو', 'الدالية',
    'حمام واصل', 'أرواد',
  ],
  إدلب: [
    'مدينة إدلب', 'معرة النعمان', 'جسر الشغور', 'أريحا', 'سراقب', 'حارم', 'سلقين', 'بنش',
    'كفرنبل', 'خان شيخون', 'معرة مصرين', 'الدانا', 'سرمدا', 'أطمة',
  ],
  'دير الزور': ['مدينة دير الزور', 'البوكمال', 'الميادين', 'القورية', 'العشارة', 'موحسن', 'البصيرة', 'هجين', 'الصور', 'خشام'],
  الرقة: ['مدينة الرقة', 'الطبقة', 'تل أبيض', 'المنصورة', 'الكرامة', 'سلوك', 'معدان'],
  الحسكة: ['مدينة الحسكة', 'القامشلي', 'رأس العين', 'المالكية', 'عامودا', 'الدرباسية', 'الشدادي', 'تل تمر', 'القحطانية', 'الهول'],
  درعا: [
    'مدينة درعا', 'بصرى الشام', 'الصنمين', 'إزرع', 'نوى', 'جاسم', 'طفس', 'داعل', 'الحراك',
    'المزيريب', 'إنخل', 'الشجرة', 'نصيب',
  ],
  السويداء: ['مدينة السويداء', 'شهبا', 'صلخد', 'القريا', 'عرمان', 'ظهر الجبل', 'المزرعة'],
  القنيطرة: ['مدينة القنيطرة', 'خان أرنبة', 'البعث', 'جباتا الخشب', 'حضر', 'الرفيد', 'بئر عجم'],
};

export const areasOf = (city: string): string[] => AREAS[city] ?? [];
export const isValidArea = (city: string, area: string) => areasOf(city).includes(area);
