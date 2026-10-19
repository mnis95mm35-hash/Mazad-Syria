import { CITIES } from '@/lib/sample_data';
import { SUBCATEGORIES } from '@/lib/taxonomy';

// يستخرج حقول الإعلان من نص حرّ (مثل منشور كتبه البائع نفسه). تخمين تقريبي لا يغني عن مراجعة الحقول.
export type ParsedAd = {
  title: string;
  description: string;
  price: number | null;
  currency: 'USD' | 'SYP' | null;
  city: string | null;
  category: string | null;
  subcategory: string | null;
  phone: string | null;
};

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (c) => {
    const i = AR_DIGITS.indexOf(c);
    return String(i >= 0 ? i : FA_DIGITS.indexOf(c));
  });
}

const CATEGORY_WORDS: [string, RegExp][] = [
  ['real-estate', /(شقة|شقه|بيت|منزل|فيلا|أرض|ارض|عقار|محل|مكتب|مزرعة|للإيجار|للايجار|طابق|غرفة نوم|م2|م²|متر)/],
  ['cars', /(سيارة|سياره|موديل|كيلومتر|كم\s|بنزين|مازوت|أوتوماتيك|اوتوماتيك|مكيفة|محرك|نيسان|تويوتا|هيونداي|كيا|مرسيدس|بي إم|شيفروليه)/],
  ['electronics', /(جوال|موبايل|ايفون|آيفون|iphone|samsung|سامسونج|لابتوب|حاسوب|كمبيوتر|تلفزيون|شاشة|بلايستيشن|ايباد|آيباد|ساعة ذكية)/],
  ['furniture', /(غرفة نوم|طقم|كنب|أريكة|ثلاجة|غسالة|براد|مطبخ|سجاد|خزانة|مكيف|فرن|غاز|بوتاجاز)/],
  ['jobs', /(مطلوب|وظيفة|فرصة عمل|نحتاج موظف|دوام)/],
  ['services', /(خدمة|خدمات|توصيل|صيانة|تصليح|نقل عفش|تصميم|دروس|تدريس)/],
];

// الترتيب مهم: نبحث عن "ريف دمشق" قبل "دمشق"
function findCity(text: string): string | null {
  const sorted = [...CITIES].sort((a, b) => b.length - a.length);
  return sorted.find((c) => text.includes(c)) ?? null;
}

function findPhone(text: string): string | null {
  const m = text.replace(/[\s.-]/g, '').match(/(?:\+|00)?(?:963)?0?(9\d{8})/);
  return m ? `0${m[1]}` : null;
}

function findPrice(text: string): { price: number; currency: 'USD' | 'SYP' } | null {
  const unit = '(\\$|دولار|دولارا|usd|ليرة|ل\\.?\\s?س|syp|مليون|ملايين|الف|ألف|آلاف|الاف)?';
  const num = '(\\d{1,3}(?:[,٬]\\d{3})+|\\d+(?:\\.\\d+)?)';
  // 1) "السعر: 5000 دولار" 2) "5000$" 3) "$5000"
  const patterns = [
    new RegExp(`(?:السعر|بسعر|المطلوب|سعر)\\s*[:=]?\\s*${num}\\s*${unit}\\s*${unit}`, 'i'),
    new RegExp(`${num}\\s*${unit}\\s*(\\$|دولار|usd|ليرة|ل\\.?\\s?س|syp)`, 'i'),
    new RegExp(`\\$\\s*${num}()()`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    let n = Number(m[1].replace(/[,٬]/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    const words = `${m[2] ?? ''} ${m[3] ?? ''}`.toLowerCase();
    if (/مليون|ملايين/.test(words)) n *= 1_000_000;
    else if (/الف|ألف|آلاف|الاف/.test(words)) n *= 1000;
    const syp = /ليرة|ل\.?\s?س|syp|مليون|ملايين/.test(words);
    const usd = /\$|دولار|usd/.test(words) || re === patterns[2];
    return { price: n, currency: syp && !usd ? 'SYP' : 'USD' };
  }
  return null;
}

export function parseAdText(raw: string): ParsedAd {
  const text = normalizeDigits(raw).replace(/\r/g, '').trim();
  const phone = findPhone(text);
  const price = findPrice(text);
  const city = findCity(text);

  let category: string | null = null;
  for (const [slug, re] of CATEGORY_WORDS) {
    if (new RegExp(re.source, 'i').test(text)) {
      category = slug;
      break;
    }
  }
  let subcategory: string | null = null;
  if (category) {
    const subs = SUBCATEGORIES[category] ?? [];
    const hit = subs.find((s) => text.includes(s.label.replace(/^(شقق|بيوت|أراضٍ)\s?/, '')) && s.slug !== 'other-cars');
    if (category === 'cars' && hit) subcategory = hit.slug;
    if (category === 'real-estate') {
      if (/(للإيجار|للايجار|ايجار)/.test(text)) subcategory = 'apartment-rent';
      else if (/(أرض|ارض)/.test(text)) subcategory = 'land';
      else if (/(محل|مكتب)/.test(text)) subcategory = 'shops-offices';
      else if (/(فيلا|بيت|منزل)/.test(text)) subcategory = 'houses-villas';
      else if (/(شقة|شقه)/.test(text)) subcategory = 'apartment-sale';
    }
  }

  // الوصف: كل النص بعد إزالة أرقام الهاتف (تظهر في أزرار التواصل) وزخارف الأسطر
  let description = text;
  if (phone) description = description.replace(/(?:\+|00)?[\d\s.-]{9,18}/g, (m) => (findPhone(m) ? '' : m));
  description = description
    .split('\n')
    .map((l) => l.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000);

  const firstLine = description.split('\n')[0] ?? '';
  const title = firstLine.replace(/^[#*\-•\s]+/, '').slice(0, 120).trim();

  return { title, description, price: price?.price ?? null, currency: price?.currency ?? null, city, category, subcategory, phone };
}
